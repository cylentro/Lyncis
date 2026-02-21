import { JastipOrder, JastipItem } from '@/lib/types';
import { extractItems, parsePrice, getParsingConfidence, countPotentialItems } from '@/lib/item-parser';
import { matchLocation } from '@/lib/location-matcher';
import { parseMultipleBlocksWithLLM } from '@/lib/llm-parser';

/**
 * Converts raw Excel rows into JastipOrder structures based on the user mapping.
 * Now includes smart parsing for item names and addresses.
 */
export async function convertRowsToOrders(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
    defaultTag: string = 'General',
    sourceFileName?: string,
    options?: { enableAI?: boolean; threshold?: number; aiThreshold?: number }
): Promise<Omit<JastipOrder, 'id'>[]> {
    const enableAI = options?.enableAI ?? true;
    const threshold = options?.threshold ?? 0.8;
    const aiThreshold = options?.aiThreshold ?? 0.8;

    // Track rows that need AI fallback
    const aiFallbackQueue: { index: number; context: string; originalOrder: Omit<JastipOrder, 'id'> }[] = [];

    // PASS 1: Native parsing + collect AI fallbacks
    const orders = await Promise.all(rows.map(async (row, index) => {
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

        // REMOVED: Placeholder "Barang Impor" logic to align with WhatsApp 1:1.
        // If finalItems is 0, we leave it as 0 to correctly trigger AI fallback.

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

        // ── AI Net Safe Logic (Collection Phase) ──
        if (enableAI) {
            const currentConfidence = getParsingConfidence(order);
            // CONTEXT EXPANSION: Scan all row cell values to find potential hidden items
            const fullRowText = Object.values(row).filter(v => v !== null && v !== undefined).join('\n');
            const totalRawItems = countPotentialItems(fullRowText);
            const hasMissingItems = totalRawItems > order.items.length;

            // Priority: Only use AI if Regex/Mapping failed significantly AND we have a phone number
            // (Sync with WhatsApp: threshold check is now strict per .env)
            const needsAiFallback = order.items.length === 0 || hasMissingItems || (currentConfidence < threshold);

            if (needsAiFallback && !!order.recipient.phone) {
                const rowContext = Object.entries(row)
                    .filter(([_, v]) => v && v.toString().trim().length > 0)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join('\n');

                aiFallbackQueue.push({ index, context: rowContext, originalOrder: order });
            }
        }

        return order;
    }));

    // PASS 2: Execute Bulk AI Fallback
    if (enableAI && aiFallbackQueue.length > 0) {
        try {
            const blocks = aiFallbackQueue.map(q => q.context);
            const aiResults = await parseMultipleBlocksWithLLM(blocks, 'excel parser');

            // Merge results back into the main orders array
            aiFallbackQueue.forEach((queueItem, i) => {
                const aiOrder = aiResults[i];
                if (aiOrder) {
                    const original = queueItem.originalOrder;

                    orders[queueItem.index] = {
                        ...original,
                        recipient: {
                            ...original.recipient,
                            name: (original.recipient.name && original.recipient.name !== 'Penerima Impor') ? original.recipient.name : (aiOrder.recipient?.name || original.recipient.name),
                            phone: original.recipient.phone || (aiOrder.recipient?.phone || ''),
                            addressRaw: original.recipient.addressRaw || (aiOrder.recipient?.addressRaw || ''),
                            provinsi: original.recipient.provinsi || (aiOrder.recipient?.provinsi || ''),
                            kota: original.recipient.kota || (aiOrder.recipient?.kota || ''),
                            kecamatan: original.recipient.kecamatan || (aiOrder.recipient?.kecamatan || ''),
                            kelurahan: original.recipient.kelurahan || (aiOrder.recipient?.kelurahan || ''),
                            kodepos: original.recipient.kodepos || (aiOrder.recipient?.kodepos || ''),
                        },
                        items: (aiOrder.items && aiOrder.items.length >= original.items.length) ? aiOrder.items as JastipItem[] : original.items,
                        metadata: {
                            ...original.metadata,
                            isAiParsed: true,
                        }
                    };

                    // Re-calculate confidence and apply AI threshold for quality control
                    const postAiConfidence = getParsingConfidence(orders[queueItem.index]);
                    if (orders[queueItem.index].metadata) {
                        orders[queueItem.index].metadata!.parseWarning = postAiConfidence < aiThreshold;
                    }
                }
            });
        } catch (err) {
            console.warn('Bulk AI fallback failed for Excel rows:', err);
        }
    }

    return orders;
}
