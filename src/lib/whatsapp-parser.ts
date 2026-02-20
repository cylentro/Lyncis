import { JastipOrder, JastipItem } from '@/lib/types';
import { matchLocation } from '@/lib/location-matcher';
import {
    parsePrice as _parsePrice,
    extractItems as _extractItems,
    getParsingConfidence as _getParsingConfidence,
    countPotentialItems as _countPotentialItems,
    ITEM_LINE_CLEANUP_PATTERNS,
    isPhoneLine,
    isContactLine
} from '@/lib/item-parser';

// Re-export shared parsing utilities so existing consumers are unaffected
export { parsePrice, getParsingConfidence, countPotentialItems } from '@/lib/item-parser';
export type { ExtractItemsResult } from '@/lib/item-parser';

/** @deprecated Use extractItems from item-parser directly. Re-exported for compatibility. */
export function extractItems(text: string): JastipItem[] {
    return _extractItems(text).items;
}

/**
 * Enhanced WhatsApp Parser with sophisticated contact extraction
 * Integrates the Original Span heuristic from parser.js
 */

interface ContactResult {
    name: string;
    address: string;
    phone: string;
}

// parsePrice is now in item-parser.ts — re-exported above



/**
 * Simplified contact splitter optimized for WhatsApp formats
 * Handles both labeled and unlabeled formats
 */
function splitContact(text: string): ContactResult {
    if (!text) return { name: "", address: "", phone: "" };

    const results: ContactResult = { name: "", address: "", phone: "" };
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Phone patterns
    const phoneLabels = ['hp', 'wa', 'telp', 'phone', 'mobile', 'tel', 'tlp', 'whatsapp', 'no hp', 'no. hp', 'no telp', 'no. telp'];
    const phoneRegex = new RegExp(
        '\\b(?:' + phoneLabels.join('|').replace(/\./g, '\\.') + ')\\b\\s*[:\\-]*\\s*([\\+\\d\\s\\.\\-\\/()]{7,}[0-9])',
        'i'
    );

    // Name patterns
    const nameLabels = ['nama', 'name', 'penerima', 'recipient', 'atas nama', 'a/n', 'an'];
    const nameRegex = new RegExp(
        '^\\b(?:' + nameLabels.join('|').replace(/\//g, '\\/') + ')\\b\\s*[:\\-]*\\s*(.+)$',
        'i'
    );

    // Address patterns
    const addressLabels = ['alamat', 'address', 'lokasi', 'location', 'almt'];
    const addressRegex = new RegExp(
        '^\\b(?:' + addressLabels.join('|') + ')\\b\\s*[:\\-]*\\s*(.+)$',
        'i'
    );

    // Address markers (for unlabeled detection)
    const addressMarkers = /\b(jl|jalan|jln|rt|rw|no|kel|kec|kab|kota|prov|blok|gang|gg)\b/i;

    // Junk/Header markers to ignore
    const headerMarkers = /^(?:order|pesanan|barang|item|list|daftar|jumlah|total|harga|qty)\s*:?\s*$/i;

    const unmatchedLines: string[] = [];

    // First pass: extract labeled fields
    lines.forEach(line => {
        let matched = false;

        // Check for labeled name
        const nameMatch = line.match(nameRegex);
        if (nameMatch) {
            results.name = nameMatch[1].trim();
            matched = true;
        }

        // Check for labeled phone
        const phoneMatch = line.match(phoneRegex);
        if (phoneMatch) {
            // Remove + and all non-digit characters, keep country code digits
            const phone = phoneMatch[1].replace(/\D/g, '');
            results.phone = phone;
            matched = true;
        }

        // Check for labeled address
        const addressMatch = line.match(addressRegex);
        if (addressMatch) {
            results.address = addressMatch[1].trim();
            matched = true;
        }

        // Check for unlabeled phone (look for a sequence of 8+ digits with common symbols)
        const phoneSymbolsRegex = /[0-9\+\s\.\-\/\(\)]{8,}/;
        const phoneMatchUnlabeled = line.match(phoneSymbolsRegex);

        if (!matched && phoneMatchUnlabeled) {
            const potentialPhone = phoneMatchUnlabeled[0];
            const cleanDigits = potentialPhone.replace(/\D/g, '');

            // Only accept if it has 8-15 digits (typical phone range) 
            // and isn't just a simple number (like a price)
            if (cleanDigits.length >= 8 && cleanDigits.length <= 15) {
                results.phone = cleanDigits;
                matched = true;
            }
        }

        if (!matched) {
            unmatchedLines.push(line);
        }
    });

    // Second pass: assign unmatched lines
    unmatchedLines.forEach((line, index) => {
        // Skip header lines
        if (headerMarkers.test(line)) return;

        // If it has address markers, it's likely an address
        if (addressMarkers.test(line)) {
            if (!results.address) {
                results.address = line;
            } else {
                results.address += ', ' + line;
            }
        }
        // First unmatched line without address markers is likely the name
        else if (!results.name && index === 0) {
            results.name = line;
        }
        // Otherwise, append to address
        else if (!results.address) {
            results.address = line;
        } else {
            results.address += ', ' + line;
        }
    });

    // Clean up results
    results.name = results.name.trim();
    results.address = results.address.trim();
    results.phone = results.phone.trim();

    return results;
}

// extractItems is now in item-parser.ts — re-exported above as a compatibility shim

/**
 * Parses raw WhatsApp text into partial JastipOrder objects using enhanced regex patterns.
 * Now includes automatic location matching from the address text.
 */
export async function parseWhatsAppText(text: string): Promise<Partial<JastipOrder>[]> {
    // Split by multiple orders - look for clear separators or repeated name patterns
    const orderBlocks = text.split(/\n\s*\n+|(?=\n\d+\.\s*(?:Nama|Name|Penerima))|(?=\n={3,})|(?=\n-{3,})/)
        .map(block => block.trim())
        .filter(block => block.length > 10); // Minimum viable order length

    const orders = await Promise.all(orderBlocks.map(async (block) => {
        // STEP 1: Extract items FIRST (before contact extraction)
        const { items } = _extractItems(block);

        // STEP 2: Remove item lines from the text to prevent them from being detected as contact info
        let cleanedBlock = block;

        // Remove all lines that were successfully parsed as items (allow trailing space)
        const itemPatterns = ITEM_LINE_CLEANUP_PATTERNS;

        itemPatterns.forEach(pattern => {
            // Only remove if it matched an actual item (not a skipped phone number)
            cleanedBlock = cleanedBlock.split('\n').map(line => {
                if (isContactLine(line)) return line; // NEVER remove contact lines
                if (pattern.test(line)) {
                    if (isPhoneLine(line)) {
                        return line;
                    }
                    return '';
                }
                return line;
            }).join('\n');
        });

        // Also remove generic order headers (standalone lines)
        cleanedBlock = cleanedBlock.replace(/^(?:order|pesanan|barang|item|list|daftar)\s*:?\s*$/gmi, '');

        // Also remove INLINE order headers (e.g. "Pesanan: 3 Aqua 600ml 9000" on same line as item)
        // These couldn't be caught by the item patterns because of the prefix.
        // Strategy: normalize inline headers in a separate pass, then re-run pattern check.
        const inlineHeaderLines = cleanedBlock.split('\n').map(line => {
            const stripped = line.replace(/^[ \t]*(?:order|pesanan|barang|item|list|daftar)\s*[:\-]\s*/i, '');
            if (stripped !== line) {
                // Line had an inline header — check if the rest is an item line
                const isItem = ITEM_LINE_CLEANUP_PATTERNS.some(p => p.test(stripped.trim()));
                if (isItem && !isContactLine(line) && !isPhoneLine(stripped.trim())) {
                    return ''; // remove it
                }
            }
            return line;
        });
        cleanedBlock = inlineHeaderLines.join('\n');

        // Also remove labeled item sections
        cleanedBlock = cleanedBlock.replace(/(?:Barang|Item|Pesanan)\s*:[\s\S]*?(?:Qty|Jumlah)\s*:\s*\d+[\s\S]*?(?:Harga|Price|Total)\s*:\s*(?:Rp\.?\s*)?[0-9.,]+/gi, '');

        // Clean up multiple newlines
        cleanedBlock = cleanedBlock.replace(/\n{2,}/g, '\n').trim();

        // STEP 3: Now extract contact info from the cleaned text
        const contact = splitContact(cleanedBlock);

        // STEP 4: Try to match location data from the address
        let locationData = {
            provinsi: '',
            kota: '',
            kecamatan: '',
            kelurahan: '',
            kodepos: '',
        };

        if (contact.address) {
            try {
                const matched = await matchLocation(contact.address);
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
                console.warn('Location matching failed:', err);
            }
        }

        const order: Partial<JastipOrder> = {
            recipient: {
                name: contact.name,
                phone: contact.phone,
                addressRaw: contact.address,
                ...locationData,
            },
            items,
            metadata: {
                potentialItemCount: _countPotentialItems(block),
                isAiParsed: false,
                originalRawText: block,
            },
            status: 'unassigned',
            tag: '',
            createdAt: Date.now(),
            logistics: {
                originId: '',
                finalPackedWeight: 0,
                dimensions: { l: 0, w: 0, h: 0 },
                volumetricWeight: 0,
                chargeableWeight: 0,
            }
        };

        return order;
    }));

    return orders;
}

// getParsingConfidence and countPotentialItems are now in item-parser.ts — re-exported above
