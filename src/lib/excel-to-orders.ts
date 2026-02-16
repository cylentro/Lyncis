import { JastipOrder, JastipItem } from '@/lib/types';

/**
 * Converts raw Excel rows into JastipOrder structures based on the user mapping.
 */
export function convertRowsToOrders(
    rows: Record<string, string>[],
    mapping: Record<string, string>,
    defaultTag: string = 'General'
): Omit<JastipOrder, 'id'>[] {
    return rows.map((row) => {
        // Determine the tag: from mapping OR default
        const rowTag = mapping['tag'] ? row[mapping['tag']]?.trim() : '';
        const tag = rowTag || defaultTag;

        // Build the item
        // For simplicity in Excel import, we assume 1 item per row. 
        // Complex multi-item rows would require a more sophisticated parser or grouping.
        const item: JastipItem = {
            id: crypto.randomUUID(),
            name: mapping['items[0].name'] ? row[mapping['items[0].name']] || 'Tanpa Nama' : 'Barang Impor',
            qty: Math.max(1, parseInt(row[mapping['items[0].qty']]) || 1),
            unitPrice: parseFloat(row[mapping['items[0].unitPrice']]) || 0,
            totalPrice: parseFloat(row[mapping['items[0].totalPrice']]) || 0,
            rawWeightKg: parseFloat(row[mapping['items[0].rawWeightKg']]) || 0,
            isManualTotal: !!mapping['items[0].totalPrice'],
        };

        // Recalculate if only unit price or only total price is provided
        if (item.unitPrice > 0 && item.totalPrice === 0) {
            item.totalPrice = item.unitPrice * item.qty;
        } else if (item.totalPrice > 0 && item.unitPrice === 0) {
            item.unitPrice = item.totalPrice / item.qty;
        }

        return {
            createdAt: Date.now(),
            tag,
            status: 'unassigned',
            recipient: {
                name: mapping['recipient.name'] ? row[mapping['recipient.name']] || 'Tanpa Nama' : 'Penerima Impor',
                phone: mapping['recipient.phone'] ? row[mapping['recipient.phone']] || '' : '',
                addressRaw: mapping['recipient.addressRaw'] ? row[mapping['recipient.addressRaw']] || '' : '',
                provinsi: '',
                kota: '',
                kecamatan: '',
                kelurahan: '',
                kodepos: '',
            },
            items: [item],
            logistics: {
                originId: '',
                finalPackedWeight: 0,
                dimensions: { l: 0, w: 0, h: 0 },
                volumetricWeight: 0,
                chargeableWeight: 0,
            },
        };
    });
}
