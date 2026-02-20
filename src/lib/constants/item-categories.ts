export interface ItemCategory {
    code: string;
    label_id: string;
    label_en: string;
}

export const ITEM_CATEGORIES: ItemCategory[] = [
    { code: 'DOC', label_id: 'Dokumen', label_en: 'Document' },
    { code: 'KESEHATAN', label_id: 'Perawatan & kesehatan', label_en: 'Care & health' },
    { code: 'LAINNYA', label_id: 'Lainnya', label_en: 'Others' },
    { code: 'ELECTRONIC', label_id: 'Elektronik', label_en: 'Electronic' },
    { code: 'FASHION', label_id: 'Model', label_en: 'Fashion' },
    { code: 'FNB', label_id: 'Makanan kering dan minuman', label_en: 'Dry food and drinks' },
    { code: 'HOUSEHOLD', label_id: 'Rumah tangga', label_en: 'Household' },
    { code: 'MAINAN', label_id: 'Mainan & hobi', label_en: 'Toy & hobby' },
    { code: 'OTOMOTIF', label_id: 'Otomotif', label_en: 'Otomotive' },
    { code: 'ATK', label_id: 'Perlengkapan tulis', label_en: 'Stationary' },
    { code: 'MEBEL', label_id: 'Mebel', label_en: 'Furniture' },
    { code: 'BARANG_BERHARGA', label_id: 'Paket Premium', label_en: 'Premium Package' },
    { code: 'COLD_DRINK', label_id: 'Minuman Dingin (Suhu Terjaga)', label_en: 'Cold Drink (Temperature Sensitive)' },
    { code: 'COLD_FOOD', label_id: 'Makanan Dingin (Bukan Es Krim)', label_en: 'Cold Food (Non Ice Cream)' },
    { code: 'COLD_OTHERS', label_id: 'Barang Dingin Lainnya', label_en: 'Other Cold Items' },
];
