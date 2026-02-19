import { JastipOrder, JastipItem } from '@/lib/types';
import { extractItems, parsePrice, getParsingConfidence, countPotentialItems } from '@/lib/item-parser';
import { matchLocation } from '@/lib/location-matcher';
import { parseWithLLM } from '@/lib/llm-parser';

/**
 * Converts raw Excel rows into JastipOrder structures based on the user mapping.
 * Now includes smart parsing for item names and addresses.
 */
export async function convertRowsToOrders(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
    defaultTag: string = 'General',
    sourceFileName?: string,
    options?: { enableAI?: boolean; threshold?: number }
): Promise<Omit<JastipOrder, 'id'>[]> {
    const enableAI = options?.enableAI ?? true;
    const threshold = options?.threshold ?? 0.8;

    const orders = await Promise.all(rows.map(async (row) => {
        // Determine the tag: from mapping OR default
        const rowTag = mapping['tag'] ? row[mapping['tag']]?.trim() : '';
        const tag = rowTag || defaultTag;

        // ── Item Extraction Logic ──
        const itemNameRaw = mapping['items[0].name'] ? (row[mapping['items[0].name']] || '').trim() : '';
        const mappedQty = parseInt(row[mapping['items[0].qty']]) || 0;
        const mappedUnitPrice = parsePrice(row[mapping['items[0].unitPrice']] || '0');
        const mappedTotalPrice = parsePrice(row[mapping['items[0].totalPrice']] || '0');
        const mappedWeight = parseFloat(row[mapping['items[0].rawWeightKg']]) || 0;

        let finalItems: JastipItem[] = [];

        // Try Smart Parsing on the Item Name cell
        let hasUnpricedItems = false;
        if (itemNameRaw) {
            const parseResult = extractItems(itemNameRaw);
            hasUnpricedItems = parseResult.hasUnpricedItems;

            if (parseResult.items.length > 0) {
                // If multiple items found, we use all of them
                finalItems = parseResult.items.map(p => ({
                    ...p,
                    // Apply weight if mapped
                    rawWeightKg: parseResult.items.length === 1 ? (mappedWeight || p.rawWeightKg) : p.rawWeightKg
                }));

                // If only one item found and we have mapped qty/price, reconcile it
                if (finalItems.length === 1) {
                    const item = finalItems[0];
                    if (mappedQty > 0) item.qty = mappedQty;

                    if (mappedUnitPrice > 0) {
                        item.unitPrice = mappedUnitPrice;
                        item.totalPrice = item.unitPrice * item.qty;
                        item.isManualTotal = false;
                    } else if (mappedTotalPrice > 0) {
                        item.totalPrice = mappedTotalPrice;
                        item.unitPrice = Math.round(item.totalPrice / item.qty);
                        item.isManualTotal = true;
                    }
                }
            }
        }

        // Fallback: If no items parsed or itemNameRaw is just a simple name
        if (finalItems.length === 0) {
            const qty = Math.max(1, mappedQty || 1);
            const unitPrice = mappedUnitPrice;
            const totalPrice = mappedTotalPrice || (unitPrice * qty);

            finalItems.push({
                id: crypto.randomUUID(),
                name: itemNameRaw || 'Barang Impor',
                qty,
                unitPrice,
                totalPrice,
                rawWeightKg: mappedWeight,
                isManualTotal: !!mapping['items[0].totalPrice'],
            });
        }

        // Secondary Recalculation (safety check)
        finalItems.forEach(item => {
            if (item.unitPrice > 0 && item.totalPrice === 0) {
                item.totalPrice = item.unitPrice * item.qty;
            } else if (item.totalPrice > 0 && item.unitPrice === 0) {
                item.unitPrice = Math.round(item.totalPrice / item.qty);
            }
        });

        // Address Parsing
        const addressRaw = mapping['recipient.addressRaw'] ? (row[mapping['recipient.addressRaw']] || '').trim() : '';
        let locationData = {
            provinsi: '',
            kota: '',
            kecamatan: '',
            kelurahan: '',
            kodepos: '',
        };

        if (addressRaw) {
            try {
                const matched = await matchLocation(addressRaw);
                if (matched && matched.confidence >= 0.3) {
                    locationData = {
                        provinsi: matched.provinsi,
                        kota: matched.kota,
                        kecamatan: matched.kecamatan,
                        kelurahan: matched.kelurahan,
                        kodepos: matched.kodepos,
                    };
                }
            } catch (err) {
                console.warn('Excel address matching failed:', err);
            }
        }

        const order: Omit<JastipOrder, 'id'> = {
            createdAt: Date.now(),
            tag,
            status: 'unassigned' as const,
            recipient: {
                name: mapping['recipient.name'] ? (row[mapping['recipient.name']] || 'Tanpa Nama').trim() : 'Penerima Impor',
                phone: (mapping['recipient.phone'] ? row[mapping['recipient.phone']] || '' : '').toString().replace(/\D/g, ''),
                addressRaw,
                ...locationData,
            },
            items: finalItems,
            logistics: {
                originId: '',
                finalPackedWeight: 0,
                dimensions: { l: 0, w: 0, h: 0 },
                volumetricWeight: 0,
                chargeableWeight: 0,
            },
            metadata: {
                sourceFileName,
                needsTriage: true,
                parseWarning: hasUnpricedItems || !locationData.kota,
            }
        };

        // ── AI Net Safe Logic ──
        if (enableAI) {
            const currentConfidence = getParsingConfidence(order);
            const totalRawItems = countPotentialItems(itemNameRaw + "\n" + addressRaw);
            const hasMissingItems = totalRawItems > order.items.length;

            // Priority: Only use AI if Regex/Mapping failed significantly
            if (order.items.length === 0 || (currentConfidence < threshold && currentConfidence < 0.6)) {
                try {
                    // Combine row data into a string for AI context
                    const rowContext = Object.entries(row)
                        .filter(([_, v]) => v && v.toString().trim().length > 0)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join('\n');

                    const aiResults = await parseWithLLM(rowContext);
                    if (aiResults && aiResults.length > 0) {
                        const aiOrder = aiResults[0];

                        // Merge AI results: Prefer mapped column data if it was strong, 
                        // but use AI for items and messy address parts.
                        return {
                            ...order,
                            recipient: {
                                ...order.recipient,
                                name: (order.recipient.name && order.recipient.name !== 'Penerima Impor') ? order.recipient.name : (aiOrder.recipient?.name || order.recipient.name),
                                phone: order.recipient.phone || (aiOrder.recipient?.phone || ''),
                                addressRaw: order.recipient.addressRaw || (aiOrder.recipient?.addressRaw || ''),
                                provinsi: order.recipient.provinsi || (aiOrder.recipient?.provinsi || ''),
                                kota: order.recipient.kota || (aiOrder.recipient?.kota || ''),
                                kecamatan: order.recipient.kecamatan || (aiOrder.recipient?.kecamatan || ''),
                                kelurahan: order.recipient.kelurahan || (aiOrder.recipient?.kelurahan || ''),
                                kodepos: order.recipient.kodepos || (aiOrder.recipient?.kodepos || ''),
                            },
                            // If AI found more items or we were missing items, use AI items
                            items: (aiOrder.items && aiOrder.items.length >= order.items.length) ? aiOrder.items as JastipItem[] : order.items,
                            metadata: {
                                ...order.metadata,
                                isAiParsed: true,
                            }
                        };
                    }
                } catch (err) {
                    console.warn('AI fallback failed for row:', err);
                }
            }
        }

        return order;
    }));

    return orders;
}
