import { JastipItem } from '@/lib/types';
import type { JastipOrder } from '@/lib/types';

/**
 * Shared item parsing library.
 * Used by both whatsapp-parser.ts and excel-to-orders.ts.
 *
 * IMPORTANT: Do NOT reduce existing capabilities.
 * All 10 original patterns are preserved verbatim.
 * Bug fixes are additive only.
 */

// ─── parsePrice ─────────────────────────────────────────────

export const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    let p = priceStr.toLowerCase().trim();

    // Handle 'k' multiplier
    let multiplier = 1;
    if (p.endsWith('k')) {
        multiplier = 1000;
        p = p.replace('k', '').trim();
    }

    // Clean up separators
    // If it's a "3,5k" format, handle decimal
    if (multiplier === 1000 && (p.includes('.') || p.includes(','))) {
        const clean = p.replace(',', '.');
        return Math.round(parseFloat(clean) * 1000);
    }

    // Normal price: strip decimals/thousand separators for now (simple heuristic)
    // Rp 30.000 -> 30000
    p = p.replace(/[.,\s]/g, '');
    return (parseInt(p) || 0) * multiplier;
};

// ─── Contact label guard ─────────────────────────────────────

const CONTACT_LABELS_REGEX = /^(nama|name|penerima|hp|wa|telp|phone|alamat|address|lokasi|almt|tlp)\s*[:\-]?$/i;
const UNLABELED_ADDRESS_REGEX = /^(alamat|address|lokasi|almt)\s+(jl|jalan|jln|blok|rt|rw|kel|kec|kab|kota|prov|taman|komplek|gg|gang|no)\b/i;

export const isContactLine = (line: string): boolean => {
    const trimmed = line.trim();
    // Case 1: labeled "Alamat: ..." or "HP: ..."
    if (/^(nama|name|penerima|hp|wa|telp|phone|alamat|address|lokasi|almt|tlp)\s*[:\-]/i.test(trimmed)) return true;

    // Case 2: unlabeled address "alamat Jl. ..." or "alamat taman ..."
    if (UNLABELED_ADDRESS_REGEX.test(trimmed)) return true;

    // Case 3: stand-alone keyword
    if (CONTACT_LABELS_REGEX.test(trimmed)) return true;

    return false;
};

// ─── Phone guard ─────────────────────────────────────────────

/**
 * Shared phone number detector
 */
export const isPhoneLine = (line: string): boolean => {
    const clean = line.replace(/\D/g, '');
    // Indonesian phone numbers are at least 10 digits usually, but 8 is safe for internal/short numbers
    return clean.length >= 8 && /^[\+\d\s\.\-\/()]{8,}$/.test(line.trim());
};

// ─── ExtractItems result type ────────────────────────────────

export interface ExtractItemsResult {
    items: JastipItem[];
    /** True when one or more lines looked like items but had no price */
    hasUnpricedItems: boolean;
}

/**
 * Regex patterns used to identify and REMOVE item lines from text 
 * before performing contact splitting. This prevents items from leaking into addresses.
 */
export const ITEM_LINE_CLEANUP_PATTERNS = [
    // Pattern 1: [Header] Qty x Item [@] Price
    /^\s*(?:(?:order|pesanan|barang|item|list|daftar)\s*[:\-]?\s*)?(\d+)\s*x\s*([^@\n]*?[A-Za-z][^@\n]*?)(?:\s*(?:@\s*)?(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?))?\s*$/mi,
    // Pattern 2: Item - Qty - Price
    /^\s*[^\-\n]+?\s*-\s*\d+\s*(?:pcs|pc|buah|box|pack)?\s*-\s*(?:Rp\.?\s*)?[0-9.,]+\s*$/mi,
    // Pattern 4: Simple list
    /^\s*[-•]\s*([A-Za-z0-9\s.]+?)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)(?:\s*x\s*(\d+))?\s*$/mi,
    // Pattern 5: Numbered list
    /^\s*\d+\.\s*[^@\n(]+?(?:\s*@\s*(?:Rp\.?\s*)?[0-9.,]+)?(?:\s*\(\d+\s*(?:pcs|pc|buah|box|pack)?\))?\s*$/mi,
    // Pattern 6: Qty Item TotalPrice
    /^\s*([1-9]\d?)\s+(.+?)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)\s*$/mi,
    // Pattern 7: Qty Item @ Price
    /^\s*(\d+)\s+(.+?)\s*@\s*(?:Rp\.?\s*)?([0-9.,k\s\.]+)\s*$/mi,
    // Pattern 8: Item Qty Price
    /^\s*([A-Za-z][\w\s\.]*?)\s+(\d+)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)\s*$/mi,
    // Pattern 9: Name Price
    /^\s*([A-Za-z][\w\s\.]*?)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)\s*$/mi,
    // Pattern 10: Item @ Price Qty
    /^\s*.+?\s+@\s*(?:Rp\.?\s*)?[0-9.,k\s]+\s+\d+\s*[x]?\s*$/mi,
    // Supplemental (unpriced)
    /^\s*([1-9]\d?)\s+([A-Za-z][A-Za-z ]*[A-Za-z])\s*$/mi,
];

// ─── extractItems ────────────────────────────────────────────

/**
 * Enhanced item extraction with multiple pattern support.
 * Returns items AND a flag indicating whether any unpriced item lines were detected.
 *
 * BUG FIX 1 (Pattern 1): "3x coca cola 21.000" now correctly yields
 *   name="coca cola", price=21000 instead of name="coca cola 21.000", price=0.
 *   The name group `[^@\n]*?` is now non-greedy and stops before a trailing price.
 *
 * BUG FIX 2 (supplemental pass): "2 ayam goreng" (qty + name, no price) is now
 *   detected and included with price=0, setting hasUnpricedItems=true.
 */
export function extractItems(text: string): ExtractItemsResult {
    const items: JastipItem[] = [];

    // ── Pre-process: strip inline order headers ──────────────
    // e.g. "Pesanan: 3 Aqua 600ml 9000" → "3 Aqua 600ml 9000"
    // This ensures patterns that start with a numeric qty can still match.
    const INLINE_HEADER_STRIP = /^[ \t]*(?:order|pesanan|barang|item|list|daftar)\s*[:\-]\s*/gim;
    const normalizedText = text.replace(INLINE_HEADER_STRIP, '');

    // ── Consumed-line tracking ──────────────────────────────
    // Key = trimmed source line. If a higher-priority pattern claims a line,
    // lower-priority patterns must skip it.
    const consumedLines = new Set<string>();

    const claimLine = (raw: string): boolean => {
        const key = raw.trim().toLowerCase();
        if (consumedLines.has(key)) return false;
        consumedLines.add(key);
        return true;
    };

    // Helpers to check if a line is already consumed
    const isConsumedLine = (raw: string) => consumedLines.has(raw.trim().toLowerCase());

    // Pattern 1 (FIXED): [Header] Qty x Item [@] Price ──────────────
    // Now allows optional "Pesanan: " etc prefix and trailing prices without @
    const qtyItemPricePattern =
        /^\s*(?:(?:order|pesanan|barang|item|list|daftar)\s*[:\-]?\s*)?(\d+)\s*x\s*([^@\n]*?[A-Za-z][^@\n]*?)(?:\s*(?:@\s*)?(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?))?\s*$/gmi;

    // Pattern 2: Item - Qty - Price
    const itemQtyPricePattern = /^\s*([A-Za-z0-9][^\-\n]*?)\s*-\s*(\d+)\s*(?:pcs|pc|buah|box|pack)?\s*-\s*(?:Rp\.?\s*)?([0-9.,]+)\s*$/gmi;

    // Pattern 3: Labeled format
    const labeledPattern = /(?:Barang|Item|Pesanan)\s*:\s*([^\n]+)[\s\S]*?(?:Qty|Jumlah)\s*:\s*(\d+)[\s\S]*?(?:Harga|Price|Total)\s*:\s*(?:Rp\.?\s*)?([0-9.,]+)/gi;

    // Pattern 4: Simple list with prices (e.g., "- Pocky Matcha 30000")
    // Now allows digits in name (e.g. "- Aqua 600ml 3000")
    const simpleListPattern = /^\s*[-•]\s*([A-Za-z0-9\s.]+?)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)(?:\s*x\s*(\d+))?\s*$/gmi;

    // Pattern 5: Numbered list (e.g., "1. Pocky Matcha @30000 (2pcs)")
    const numberedPattern = /^\s*\d+\.\s*([^@\n(]+?)(?:\s*@\s*(?:Rp\.?\s*)?([0-9.,]+))?(?:\s*\((\d+)\s*(?:pcs|pc|buah|box|pack)?\))?\s*$/gmi;

    // Pattern 6: Qty Item TotalPrice (e.g., "3 Indomie 9.000" or "2 Teh Pucuk 2.5k")
    const qtyItemTotalPattern = /^\s*([1-9]\d?)\s+(.+?)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)\s*$/gmi;

    // Pattern 7: Qty Item @ Price (e.g., "3 Aqua 600ml @3k")
    const qtyItemAtPricePattern = /^\s*(\d+)\s+(.+?)\s*@\s*(?:Rp\.?\s*)?([0-9.,k\s\.]+)\s*$/gmi;

    // Pattern 8: Item Qty Price (e.g. "Indomie Goreng Rendang 3 9000")
    const itemQtyTotalPattern = /^\s*([A-Za-z][\w\s\.]*?)\s+(\d+)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)\s*$/gmi;

    // Pattern 9: Name Price (assumes qty 1, e.g. "Indomie Kuah Soto 9000")
    const namePricePattern = /^\s*([A-Za-z][\w\s\.]*?)\s+(?:Rp\.?\s*)?([0-9.,]+(?:\s*k)?)\s*$/gmi;

    // Pattern 10: Item @ Price Qty (e.g., "Pocky Matcha @30000 2x")
    const itemAtPriceQtyPattern = /^\s*(.+?)\s+@\s*(?:Rp\.?\s*)?([0-9.,k\s]+)\s+(\d+)\s*[x]?\s*$/gmi;

    let match;

    // ── Pattern 1 (FIXED): Qty x Item [@] Price ──────────────
    while ((match = qtyItemPricePattern.exec(normalizedText)) !== null) {
        if (!claimLine(match[0])) continue;
        const qty = parseInt(match[1]) || 1;
        const name = match[2].trim();
        // Only accept if name contains at least one letter (guards against pure-number matches)
        if (!/[A-Za-z]/.test(name)) continue;
        const unitPrice = parsePrice(match[3] || '0');

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice,
            totalPrice: qty * unitPrice,
            rawWeightKg: 0,
            isManualTotal: false,
        });
    }

    // ── Pattern 2: Item - Qty - Price ────────────────────────
    while ((match = itemQtyPricePattern.exec(normalizedText)) !== null) {
        if (isConsumedLine(match[0])) continue;
        const fullMatch = match[0].trim();
        if (/^[\+\d\s\.\-\/()]{8,}$/.test(fullMatch) && fullMatch.replace(/\D/g, '').length >= 8) {
            continue;
        }
        if (!claimLine(match[0])) continue;
        const name = match[1].trim();
        const qty = parseInt(match[2]) || 1;
        const totalPrice = parsePrice(match[3]);
        const unitPrice = Math.round(totalPrice / qty);

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice,
            totalPrice,
            rawWeightKg: 0,
            isManualTotal: true,
        });
    }

    // ── Pattern 3: Labeled format ────────────────────────────
    while ((match = labeledPattern.exec(normalizedText)) !== null) {
        if (!claimLine(match[0])) continue;
        const name = match[1].trim();
        const qty = parseInt(match[2]) || 1;
        const price = parsePrice(match[3]);
        const isTotal = normalizedText.toLowerCase().includes('total') && !normalizedText.toLowerCase().includes('harga satuan');

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice: isTotal ? Math.round(price / qty) : price,
            totalPrice: isTotal ? price : price * qty,
            rawWeightKg: 0,
            isManualTotal: isTotal,
        });
    }

    // ── Pattern 4: Simple list ───────────────────────────────
    while ((match = simpleListPattern.exec(normalizedText)) !== null) {
        if (!claimLine(match[0])) continue;
        const name = match[1].trim();
        const price = parsePrice(match[2]);
        const qty = match[3] ? parseInt(match[3]) : 1;

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice: price,
            totalPrice: price * qty,
            rawWeightKg: 0,
            isManualTotal: false,
        });
    }

    // ── Pattern 5: Numbered list ─────────────────────────────
    while ((match = numberedPattern.exec(normalizedText)) !== null) {
        if (!claimLine(match[0])) continue;
        const name = match[1].trim();
        const unitPrice = parsePrice(match[2]);
        const qty = match[3] ? parseInt(match[3]) : 1;

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice,
            totalPrice: unitPrice * qty,
            rawWeightKg: 0,
            isManualTotal: false,
        });
    }

    // ── Pattern 7: Qty Item @ Price ──────────────────────────
    // Run BEFORE Pattern 6 so "@" lines are claimed by P7 first
    while ((match = qtyItemAtPricePattern.exec(normalizedText)) !== null) {
        if (isConsumedLine(match[0])) continue;
        if (isContactLine(match[0])) continue;
        if (!claimLine(match[0])) continue;
        const qty = parseInt(match[1]) || 1;
        const name = match[2].trim();
        const unitPrice = parsePrice(match[3]);

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice,
            totalPrice: qty * unitPrice,
            rawWeightKg: 0,
            isManualTotal: false,
        });
    }

    // ── Pattern 10: Item @ Price Qty ─────────────────────────
    // Run BEFORE P6/P8/P9 so "@" lines are claimed first
    while ((match = itemAtPriceQtyPattern.exec(normalizedText)) !== null) {
        if (isConsumedLine(match[0])) continue;
        if (isContactLine(match[0])) continue;
        if (!claimLine(match[0])) continue;
        const name = match[1].trim();
        const unitPrice = parsePrice(match[2]);
        const qty = parseInt(match[3]) || 1;

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice,
            totalPrice: qty * unitPrice,
            rawWeightKg: 0,
            isManualTotal: false,
        });
    }

    // ── Pattern 6: Qty Item TotalPrice ───────────────────────
    // P6 runs BEFORE P8/P9 to claim "N Item Price" lines
    while ((match = qtyItemTotalPattern.exec(normalizedText)) !== null) {
        if (isConsumedLine(match[0])) continue;
        if (isContactLine(match[0])) continue;
        if (!claimLine(match[0])) continue;
        const qty = parseInt(match[1]) || 1;
        const name = match[2].trim();
        const totalPrice = parsePrice(match[3]);
        const unitPrice = Math.round(totalPrice / qty);

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice,
            totalPrice,
            rawWeightKg: 0,
            isManualTotal: true,
        });
    }

    // ── Pattern 8: Item Qty Price ────────────────────────────
    // LOWER priority: skip lines already claimed by P1-P7
    while ((match = itemQtyTotalPattern.exec(normalizedText)) !== null) {
        if (isConsumedLine(match[0])) continue;
        if (isContactLine(match[0])) continue;
        if (!claimLine(match[0])) continue;
        const name = match[1].trim();
        const qty = parseInt(match[2]) || 1;
        const totalPrice = parsePrice(match[3]);
        const unitPrice = Math.round(totalPrice / qty);

        items.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice,
            totalPrice,
            rawWeightKg: 0,
            isManualTotal: true,
        });
    }

    // ── Pattern 9: Name Price ────────────────────────────────
    // LOWEST priority: only runs on unclaimed lines
    while ((match = namePricePattern.exec(normalizedText)) !== null) {
        if (isConsumedLine(match[0])) continue;
        if (isContactLine(match[0])) continue;
        const name = match[1].trim();

        // Anti-leakage: if name starts with common address/contact keyword
        if (/^(alamat|address|lokasi|almt|telp|phone|nama|name|hp|wa)\b/i.test(name)) continue;
        // Anti-leakage: if name is strictly numeric
        if (/^\d+$/.test(name)) continue;

        if (!claimLine(match[0])) continue;
        const price = parsePrice(match[2]);

        items.push({
            id: crypto.randomUUID(),
            name,
            qty: 1,
            unitPrice: price,
            totalPrice: price,
            rawWeightKg: 0,
            isManualTotal: false,
        });
    }

    // ── Deduplicate (keep first occurrence) ──────────────────
    const seen = new Set<string>();
    const deduped = items.filter(item => {
        const key = `${item.name.toLowerCase()}-${item.qty}-${item.unitPrice}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // ── Supplemental pass: detect unpriced item lines (BUG FIX 2) ──
    // After all patterns have run, scan each line for "qty name" with no price.
    // These are included with price=0 and flagged via hasUnpricedItems.
    const matchedNames = new Set(deduped.map(i => i.name.toLowerCase()));
    let hasUnpricedItems = false;

    // Pattern: starts with 1-2 digit qty, then a name with letters, MUST end with a letter (no trailing price digits)
    const unpricedPattern = /^\s*([1-9]\d?)\s+([A-Za-z][A-Za-z ]*[A-Za-z])\s*$/gm;
    while ((match = unpricedPattern.exec(normalizedText)) !== null) {
        if (isContactLine(match[0])) continue;
        if (isPhoneLine(match[0])) continue;

        const qty = parseInt(match[1]) || 1;
        const name = match[2].trim();

        // Skip if already matched by another pattern
        if (matchedNames.has(name.toLowerCase())) continue;

        hasUnpricedItems = true;
        deduped.push({
            id: crypto.randomUUID(),
            name,
            qty,
            unitPrice: 0,
            totalPrice: 0,
            rawWeightKg: 0,
            isManualTotal: false,
        });
        matchedNames.add(name.toLowerCase());
    }

    return { items: deduped, hasUnpricedItems };
}

// ─── getParsingConfidence ────────────────────────────────────

/**
 * Returns a score from 0 to 1 based on parsing confidence.
 */
export function getParsingConfidence(order: Partial<JastipOrder>): number {
    let score = 0;

    if (order.recipient?.name && order.recipient.name.length > 2) score += 0.35;
    if (order.recipient?.phone && order.recipient.phone.length >= 8) score += 0.25;
    if (order.recipient?.addressRaw && order.recipient.addressRaw.length > 10) score += 0.25;
    if (order.items && order.items.length > 0) {
        score += 0.15;
        // Bonus for items with prices
        if (order.items.some(item => item.unitPrice > 0)) score += 0.05;
    }

    return Math.min(score, 1.0);
}

// ─── countPotentialItems ─────────────────────────────────────

/**
 * Heuristic to count how many lines in the text look like items.
 * Used to determine if regex-based parser missed anything.
 */
export function countPotentialItems(text: string): number {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let count = 0;

    const itemStartMarkers = [
        /^(\s*[-•]\s+)/,           // Bullets
        /^\s*\d+\s*[x\.]\s+/i,     // "2x ..." or "1. ..."
        /^\s*\d+\s+[A-Z]/,         // "3 Chitato ..."
    ];

    const itemContentMarkers = [
        /@\s*(?:Rp\.?)?\s*[0-9.,k]+/i,
        /\s+(?:Rp\.)?\s*[0-9.,]+(?:k)?\b/i,
        /\s*x\s*\d+\s*/i,
    ];

    lines.forEach(line => {
        // Skip labeled contact fields (with colon)
        const contactLabels = /^(nama|name|penerima|hp|wa|telp|telepon|phone|alamat|address|lokasi|almt|tlp|nohp|nomor)\s*[:\-]/i;
        if (contactLabels.test(line)) return;

        // Skip UNLABELED address/contact lines — "alamat taman..." "telepon 08..." (no colon)
        const unlabeledContactPrefix = /^(alamat|address|lokasi|almt|telepon|telp|hp|wa|phone|nohp|nomor)\s+/i;
        if (unlabeledContactPrefix.test(line)) return;

        // Skip common address start markers
        if (/^\s*(jl\.|jalan|jln|blok|rt|rw|no\.|kodepos|kec\.|kel\.|kab\.|prov\.)/i.test(line)) return;

        // Skip lines containing address-specific Indonesian keywords mid-line
        // (catches foreign/informal addresses like "Buangkok avenue 1 #19-1928 kecamatan setiabudi")
        if (/\b(kecamatan|kelurahan|kabupaten|provinsi|avenue|komplek|perumahan|gang|gg\.)\b/i.test(line)) return;

        // Skip common order headers if they are ALONE on the line
        if (/^\s*(order|pesanan|barang|item|list|daftar)\s*:?\s*$/i.test(line)) return;

        if (line.split(/[,;\t]/).length >= 3) return;

        let isItem = itemStartMarkers.some(m => m.test(line));
        if (!isItem) {
            isItem = itemContentMarkers.some(m => m.test(line));
        }

        if (isItem) {
            if (isPhoneLine(line)) return;
            count++;
        }
    });

    return count;
}
