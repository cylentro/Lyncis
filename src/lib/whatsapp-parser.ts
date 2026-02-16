import { JastipOrder, JastipItem } from '@/lib/types';

/**
 * Parses raw WhatsApp text into partial JastipOrder objects using regex patterns.
 * Designed for common Indonesian Jastip formats.
 */
export function parseWhatsAppText(text: string): Partial<JastipOrder>[] {
    // Split text by multiple orders (double newline or numbered lists or "Nama:")
    // We use a lookahead to split before "Nama:", "Name:", "Penerima:", etc.
    const orderBlocks = text.split(/\n\s*\n|\n(?=\d+\.)|\n(?=(?:Nama|Name|Penerima|Atas Nama|A\/N)\s*:)/i)
        .map(block => block.trim())
        .filter(block => block.length > 0);

    return orderBlocks.map(block => {
        const order: any = {
            recipient: {},
            items: [],
            status: 'unassigned',
            logistics: {
                originId: '',
                finalPackedWeight: 0,
                dimensions: { l: 0, w: 0, h: 0 },
                volumetricWeight: 0,
                chargeableWeight: 0,
            }
        };

        // 1. Extract Name
        const nameMatch = block.match(/(?:Nama|Name|Penerima|Atas Nama|A\/N)\s*:\s*([^\n]+)/i);
        if (nameMatch) order.recipient.name = nameMatch[1].trim();

        // 2. Extract Phone
        const phoneMatch = block.match(/(?:HP|No HP|Telp|WA|No\. Telepon|WhatsApp)\s*:\s*([^\n\s,]+)/i)
            || block.match(/(?:08|\+62)\d{8,13}/);
        if (phoneMatch) order.recipient.phone = phoneMatch[0].trim().replace(/[^0-9+]/g, '');

        // 3. Extract Address
        // Address often starts after "Alamat:" and goes until the next known marker or end of block
        const addressMatch = block.match(/(?:Alamat|Almt|Address)\s*:\s*([\s\S]+?)(?=\n(?:Barang|Item|Pesanan|Harga|Total|HP|WA|Telp|08|\+62)|$)/i);
        if (addressMatch) {
            order.recipient.addressRaw = addressMatch[1].trim();
        } else if (order.recipient.name && !order.recipient.addressRaw) {
            // Heuristic: if we have a name but no address marker, look for a large block of text that looks like an address
            // (This is risky, usually handled better by LLM fallback)
        }

        // 4. Extract Items
        // Pattern: [Qty]x [Name] [@Price]
        const itemLines = block.split('\n').filter(line =>
            line.match(/\d+x/i) || line.match(/(?:Barang|Item|Pesanan)\s*:/i)
        );

        itemLines.forEach(line => {
            const itemMatch = line.match(/(\d+)\s*x\s*([^@\n]+)(?:@\s*(\d+))?/i);
            if (itemMatch) {
                const qty = parseInt(itemMatch[1]) || 1;
                const name = itemMatch[2].trim();
                const unitPrice = parseInt(itemMatch[3]) || 0;

                order.items.push({
                    id: crypto.randomUUID(),
                    name,
                    qty,
                    unitPrice,
                    totalPrice: qty * unitPrice,
                    rawWeightKg: 0,
                    isManualTotal: false,
                });
            }
        });

        return order;
    });
}

/**
 * Returns a score from 0 to 1 based on how likely the parsing was successful.
 */
export function getParsingConfidence(order: Partial<JastipOrder>): number {
    let score = 0;
    if (order.recipient?.name) score += 0.3;
    if (order.recipient?.phone) score += 0.2;
    if (order.recipient?.addressRaw) score += 0.3;
    if (order.items && order.items.length > 0) score += 0.2;
    return score;
}
