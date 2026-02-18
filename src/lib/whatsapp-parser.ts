import { JastipOrder, JastipItem } from '@/lib/types';
import { matchLocation } from '@/lib/location-matcher';

/**
 * Enhanced WhatsApp Parser with sophisticated contact extraction
 * Integrates the Original Span heuristic from parser.js
 */

interface ContactResult {
    name: string;
    address: string;
    phone: string;
}

const CONTACT_LABELS_REGEX = /^(nama|name|penerima|hp|wa|telp|phone|alamat|address|lokasi|almt|tlp)\s*[:\-]/i;

const isContactLine = (line: string): boolean => {
    return CONTACT_LABELS_REGEX.test(line.trim());
};

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

/**
 * Enhanced item extraction with multiple pattern support
 */
function extractItems(text: string): JastipItem[] {
    const items: JastipItem[] = [];

    // Pattern 1: Quantity x Item @ Price (e.g., "2x Pocky Matcha @30000")
    const qtyItemPricePattern = /^\s*(\d+)\s*x\s*([^@\n]+?)(?:\s*@\s*(?:Rp\.?\s*)?([0-9.,]+))?\s*$/gmi;

    // Pattern 2: Item - Qty - Price (stricter Name part: must start with a letter or digit, but skip if it looks like a phone prefix)
    const itemQtyPricePattern = /^\s*([A-Za-z0-9][^\-\n]*?)\s*-\s*(\d+)\s*(?:pcs|pc|buah|box|pack)?\s*-\s*(?:Rp\.?\s*)?([0-9.,]+)\s*$/gmi;

    // Pattern 3: Labeled format (stays as is, handles multiple lines)
    const labeledPattern = /(?:Barang|Item|Pesanan)\s*:\s*([^\n]+)[\s\S]*?(?:Qty|Jumlah)\s*:\s*(\d+)[\s\S]*?(?:Harga|Price|Total)\s*:\s*(?:Rp\.?\s*)?([0-9.,]+)/gi;

    // Pattern 4: Simple list with prices (e.g., "- Pocky Matcha 30000")
    const simpleListPattern = /^\s*[-•]\s*([^\d\n]+?)\s+(?:Rp\.?\s*)?([0-9.,]+)(?:\s*x\s*(\d+))?\s*$/gmi;

    // Pattern 5: Numbered list (e.g., "1. Pocky Matcha @30000 (2pcs)")
    const numberedPattern = /^\s*\d+\.\s*([^@\n(]+?)(?:\s*@\s*(?:Rp\.?\s*)?([0-9.,]+))?(?:\s*\((\d+)\s*(?:pcs|pc|buah|box|pack)?\))?\s*$/gmi;

    // Pattern 6: Qty Item TotalPrice (e.g., "3 Chitato 45000" or "2 Teh Botol 250ml 5k")
    const qtyItemTotalPattern = /^\s*([1-9]\d?)\s+(.+?)\s+(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:\s*k)?|\d+(?:\s*k)?)\s*$/gmi;

    // Pattern 7: Qty Item @ Price (e.g., "3 Aqua 600ml @3k")
    const qtyItemAtPricePattern = /^\s*(\d+)\s+(.+?)\s*@\s*(?:Rp\.?\s*)?([0-9.,k\s]+)\s*$/gmi;

    // Pattern 8: Item Qty Price (e.g. "Indomie Goreng Rendang 3 9000")
    const itemQtyTotalPattern = /^\s*([A-Za-z][^\d\n:]+?)\s+(\d+)\s+(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:\s*k)?|\d+(?:\s*k)?)\s*$/gmi;

    // Pattern 9: Name Price (assumes qty 1, e.g. "Indomie Kuah Soto 9000")
    const namePricePattern = /^\s*([A-Za-z][^\d\n:]+?)\s+(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:\s*k)?|\d+(?:\s*k)?)\s*$/gmi;

    // Pattern 10: Item @ Price Qty (e.g., "Pocky Matcha @30000 2x")
    const itemAtPriceQtyPattern = /^\s*(.+?)\s+@\s*(?:Rp\.?\s*)?([0-9.,k\s]+)\s+(\d+)\s*[x]?\s*$/gmi;

    const isContactLineCheck = (line: string): boolean => {
        return CONTACT_LABELS_REGEX.test(line.trim());
    };

    const parsePrice = (priceStr: string): number => {
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

    // Try all patterns
    let match;

    // Pattern 1: Qty x Item @ Price
    while ((match = qtyItemPricePattern.exec(text)) !== null) {
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

    // Pattern 2: Item - Qty - Price
    while ((match = itemQtyPricePattern.exec(text)) !== null) {
        const fullMatch = match[0].trim();
        // Skip if the whole line looks like a phone number (mostly digits and phone symbols)
        if (/^[\+\d\s\.\-\/()]{8,}$/.test(fullMatch) && fullMatch.replace(/\D/g, '').length >= 8) {
            continue;
        }

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

    // Pattern 3: Labeled format
    while ((match = labeledPattern.exec(text)) !== null) {
        const name = match[1].trim();
        const qty = parseInt(match[2]) || 1;
        const price = parsePrice(match[3]);

        // Determine if it's unit price or total price based on context
        const isTotal = text.toLowerCase().includes('total') && !text.toLowerCase().includes('harga satuan');

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

    // Pattern 4: Simple list
    while ((match = simpleListPattern.exec(text)) !== null) {
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

    // Pattern 5: Numbered list
    while ((match = numberedPattern.exec(text)) !== null) {
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

    // Pattern 6: Qty Item TotalPrice
    while ((match = qtyItemTotalPattern.exec(text)) !== null) {
        if (isContactLine(match[0])) continue;
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

    // Pattern 7: Qty Item @ Price
    while ((match = qtyItemAtPricePattern.exec(text)) !== null) {
        if (isContactLine(match[0])) continue;
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

    // Pattern 8: Item Qty Price
    while ((match = itemQtyTotalPattern.exec(text)) !== null) {
        if (isContactLine(match[0])) continue;
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

    // Pattern 9: Name Price
    while ((match = namePricePattern.exec(text)) !== null) {
        if (isContactLine(match[0])) continue;
        const name = match[1].trim();
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

    // Pattern 10: Item @ Price Qty
    while ((match = itemAtPriceQtyPattern.exec(text)) !== null) {
        if (isContactLine(match[0])) continue;
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

    // Deduplicate items (keep first occurrence)
    const seen = new Set<string>();
    return items.filter(item => {
        const key = `${item.name.toLowerCase()}-${item.qty}-${item.unitPrice}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

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
        const items = extractItems(block);

        // STEP 2: Remove item lines from the text to prevent them from being detected as contact info
        let cleanedBlock = block;

        // Remove all lines that were successfully parsed as items (allow trailing space)
        const itemPatterns = [
            /^\s*\d+\s*x\s*[^@\n]+(?:\s*@\s*(?:Rp\.?\s*)?[0-9.,]+)?\s*$/mi,  // Pattern 1
            /^\s*[^\-\n]+?\s*-\s*\d+\s*(?:pcs|pc|buah|box|pack)?\s*-\s*(?:Rp\.?\s*)?[0-9.,]+\s*$/mi,  // Pattern 2
            /^\s*[-•]\s*[^\d\n]+?\s+(?:Rp\.?\s*)?[0-9.,]+(?:\s*x\s*\d+)?\s*$/mi,  // Pattern 4
            /^\s*\d+\.\s*[^@\n(]+?(?:\s*@\s*(?:Rp\.?\s*)?[0-9.,]+)?(?:\s*\(\d+\s*(?:pcs|pc|buah|box|pack)?\))?\s*$/mi,  // Pattern 5
            /^\s*[1-9]\d?\s+.+?\s+(?:Rp\.?\s*)?(?:\d{1,3}(?:[.,]\d{3})*(?:\s*k)?|\d+(?:\s*k)?)\s*$/mi,  // Pattern 6 (revised)
            /^\s*\d+\s+.+?\s*@\s*(?:Rp\.?\s*)?[0-9.,k\s]+\s*$/mi, // Pattern 7 (revised)
            /^\s*[A-Za-z][^\d\n]+?\s+\d+\s+(?:Rp\.?\s*)?(?:\d{1,3}(?:[.,]\d{3})*(?:\s*k)?|\d+(?:\s*k)?)\s*$/mi, // Pattern 8
            /^\s*[A-Za-z][^\d\n]+?\s+(?:Rp\.?\s*)?(?:\d{1,3}(?:[.,]\d{3})*(?:\s*k)?|\d+(?:\s*k)?)\s*$/mi, // Pattern 9
            /^\s*.+?\s+@\s*(?:Rp\.?\s*)?[0-9.,k\s]+\s+\d+\s*[x]?\s*$/mi, // Pattern 10
        ];

        itemPatterns.forEach(pattern => {
            // Only remove if it matched an actual item (not a skipped phone number)
            cleanedBlock = cleanedBlock.split('\n').map(line => {
                if (isContactLine(line)) return line; // NEVER remove contact lines
                if (pattern.test(line)) {
                    const cleanDigits = line.replace(/\D/g, '');
                    // If it looks like a phone (all numeric symbols and 8+ digits), do NOT remove it
                    if (/^[\+\d\s\.\-\/()]{8,}$/.test(line.trim()) && cleanDigits.length >= 8) {
                        return line;
                    }
                    return '';
                }
                return line;
            }).join('\n');
        });

        // Also remove generic order headers
        cleanedBlock = cleanedBlock.replace(/^(?:order|pesanan|barang|item|list|daftar)\s*:?\s*$/gmi, '');

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
                potentialItemCount: countPotentialItems(block),
                isAiParsed: false,
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

/**
 * Heuristic to count how many lines in the text look like items.
 * Used to determine if regex-based parser missed anything.
 */
export function countPotentialItems(text: string): number {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let count = 0;

    // Patterns that strongly suggest an item line
    const itemStartMarkers = [
        /^(\s*[-•]\s+)/,           // Bullets
        /^\s*\d+\s*[x\.]\s+/i,      // "2x ..." or "1. ..."
        /^\s*\d+\s+[A-Z]/,          // "3 Chitato ..."
    ];

    const itemContentMarkers = [
        /@\s*(?:Rp\.?)?\s*[0-9.,k]+/i,   // Contains price with @ or Rp
        /\s+(?:Rp\.?)?\s*[0-9.,]+(?:k)?\b/i, // Contains price at end of line (e.g. 15000 or 15k)
        /\s*x\s*\d+\s*/i,                 // Contains x qty
    ];

    lines.forEach(line => {
        // Exclude lines that are clearly contact labels
        const contactLabels = /^(nama|name|penerima|hp|wa|telp|phone|alamat|address|lokasi|almt)\s*:/i;
        if (contactLabels.test(line)) return;

        // Exclude lines that look like full contacts (name/phone/address)
        if (line.split(/[,;\t]/).length >= 3) return;

        // Check if line starts like an item
        let isItem = itemStartMarkers.some(m => m.test(line));

        // Or if it contains item-like content (qty/price)
        if (!isItem) {
            isItem = itemContentMarkers.some(m => m.test(line));
        }

        if (isItem) {
            // Final check: don't count if it's strictly a name-labeled line or just a phone number
            const phoneDigitsOnly = line.replace(/\D/g, '');
            if (phoneDigitsOnly.length >= 8 && /^[\+\d\s\.\-\/()]{8,}$/.test(line)) return;

            count++;
        }
    });

    return count;
}
