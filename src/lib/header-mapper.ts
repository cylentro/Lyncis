/**
 * Generates a unique hash for a list of headers.
 * Normalizes, sorts, and joins headers to ensure the same format always yields the same hash.
 */
export function generateHeaderHash(headers: string[]): string {
    const normalized = headers
        .map((h) => h.trim().toLowerCase())
        .sort()
        .join('|');

    // Use btoa for a simple base64 hash (sufficient for localized mapping keys)
    try {
        return btoa(normalized);
    } catch (e) {
        // Fallback if there are non-latin characters that btoa can't handle
        return normalized.length + '_' + normalized.substring(0, 50);
    }
}

const STORAGE_PREFIX = 'lyncis_header_maps_';

export function loadSavedMapping(hash: string): Record<string, string> | null {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${hash}`);
    if (!saved) return null;
    try {
        return JSON.parse(saved);
    } catch (e) {
        return null;
    }
}

export function saveMappingForHash(hash: string, mapping: Record<string, string>): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${STORAGE_PREFIX}${hash}`, JSON.stringify(mapping));
}

/**
 * Target fields that user needs to map to from Excel columns.
 */
export const TARGET_FIELDS = [
    { key: 'recipient.name', label: 'Nama Penerima' },
    { key: 'recipient.phone', label: 'No. Telepon' },
    { key: 'recipient.addressRaw', label: 'Alamat Lengkap' },
    { key: 'items[0].name', label: 'Nama Barang' },
    { key: 'items[0].qty', label: 'Qty' },
    { key: 'items[0].unitPrice', label: 'Harga Satuan' },
    { key: 'items[0].totalPrice', label: 'Total Harga' },
    { key: 'tag', label: 'Tag / Nama Event' },
] as const;
