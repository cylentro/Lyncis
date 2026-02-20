'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { JastipOrder } from '@/lib/types';
import { matchLocation } from '@/lib/location-matcher';
import { countPotentialItems } from '@/lib/whatsapp-parser';

const API_KEY = process.env.GEMINI_API_KEY || '';
const LLM_MODEL = process.env.LLM_MODEL || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const AI_MODE = (process.env.AI_MODE || 'gemini').toLowerCase();

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Removes markdown code blocks and trims whitespace from a string.
 */
function cleanJsonString(text: string): string {
    let cleaned = text.trim();
    // Match both ```json and plain ```
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
    }
    return cleaned.trim();
}
// ─── Shared extraction rules (kept minimal to save tokens) ────────────────
const EXTRACTION_RULES = `STRUCTURE PARSING:
- "kirim ke" marks the start of an address or recipient info.
- "pesen" marks the start of the item list.
- Text before "List:"/"Pesanan:"/"Order:" or item lines = recipient info (name, phone, address)
- A 5-digit number in address context (e.g. "Jaksel 12940") is a ZIPCODE, not a price
- Item lines start with qty+name or name+qty pattern, often after "List:" marker
- addressRaw = full address text including building, street, area, zipcode
PRICE RULES:
- "k"=×1000, "rb"/"ribu"=×1000 (5k=5000, 30rb=30000, 15.5k=15500)
- "." and "," are thousand separators (10.000=10000, 10,000=10000)
- "@" or "/pc" = UNIT price; otherwise price is TOTAL for that qty
- If qty missing, default 1. If price missing, set 0
LOCATION: Always set provinsi/kota/kecamatan/kelurahan/kodepos to "" — our system resolves these separately
EXAMPLES:
"2x Pocky @30k" → qty:2, unitPrice:30000, totalPrice:60000
"5 Donat 50k" → qty:5, unitPrice:10000, totalPrice:50000
"Chitato 15.5k" → qty:1, unitPrice:15500, totalPrice:15500
"3 Aqua 600ml @3rb" → qty:3, unitPrice:3000, totalPrice:9000`;

// ─── Gemini: relies on responseSchema, so prompt is ultra-lean ────────────
const GEMINI_PROMPT = `Extract all jastip orders from the Indonesian WhatsApp text below.
Return a JSON array. Each element has: recipient{name,phone,addressRaw,provinsi,kota,kecamatan,kelurahan,kodepos}, items[{name,qty,unitPrice,totalPrice,rawWeightKg}], tag.
${EXTRACTION_RULES}`;

// ─── Gemma: no native JSON mode, so we provide a strict template ──────────
const GEMMA_PROMPT = `Extract jastip orders. Output ONLY a raw JSON array, no markdown.
Template: [{"recipient":{"name":"","phone":"","addressRaw":"","provinsi":"","kota":"","kecamatan":"","kelurahan":"","kodepos":""},"items":[{"name":"","qty":1,"unitPrice":0,"totalPrice":0,"rawWeightKg":0}],"tag":""}]
${EXTRACTION_RULES}
Output raw JSON array only. No \`\`\`, no explanation.`;

// ─── Gemini JSON Schema (used with responseSchema for structured output) ──
const GEMINI_RESPONSE_SCHEMA = {
    type: 'ARRAY' as const,
    items: {
        type: 'OBJECT' as const,
        properties: {
            recipient: {
                type: 'OBJECT' as const,
                properties: {
                    name: { type: 'STRING' as const },
                    phone: { type: 'STRING' as const },
                    addressRaw: { type: 'STRING' as const },
                    provinsi: { type: 'STRING' as const },
                    kota: { type: 'STRING' as const },
                    kecamatan: { type: 'STRING' as const },
                    kelurahan: { type: 'STRING' as const },
                    kodepos: { type: 'STRING' as const },
                },
            },
            items: {
                type: 'ARRAY' as const,
                items: {
                    type: 'OBJECT' as const,
                    properties: {
                        name: { type: 'STRING' as const },
                        qty: { type: 'NUMBER' as const },
                        unitPrice: { type: 'NUMBER' as const },
                        totalPrice: { type: 'NUMBER' as const },
                        rawWeightKg: { type: 'NUMBER' as const },
                    },
                },
            },
            tag: { type: 'STRING' as const },
        },
    },
};

export async function parseWithLLM(text: string): Promise<Partial<JastipOrder>[]> {
    if (!API_KEY) {
        throw new Error('Ekstraksi AI tidak tersedia (API Key belum dikonfigurasi).');
    }

    try {
        const model = genAI.getGenerativeModel({ model: LLM_MODEL });
        const isGemini = AI_MODE === 'gemini';

        const generationConfig: any = {
            temperature: 0.1,
            topP: 0.85,
            topK: 40,
        };

        if (isGemini) {
            generationConfig.responseMimeType = 'application/json';
            generationConfig.responseSchema = GEMINI_RESPONSE_SCHEMA;
        }

        const prompt = isGemini ? GEMINI_PROMPT : GEMMA_PROMPT;

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [{ text: `${prompt}\n\nINPUT:\n${text}` }]
            }],
            generationConfig,
        });

        const responseRaw = result.response.text();
        const responseText = isGemini ? responseRaw : cleanJsonString(responseRaw);

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            console.error('Initial JSON Parse failed, trying to rescue...', responseText);
            // Emergency rescue for common LLM junk
            const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw e;
            }
        }

        const orders = Array.isArray(parsed) ? parsed : [parsed];

        // Process each order
        const ordersWithMetadata = await Promise.all(orders.map(async (order: any) => {
            // Priority: Internal Location Lookup
            // We initialize with empty values to satisfy "if cannot find, leave blank"
            let locationData = {
                provinsi: '',
                kota: '',
                kecamatan: '',
                kelurahan: '',
                kodepos: '',
            };

            // Only attempt lookup if addressRaw exists
            if (order.recipient?.addressRaw) {
                try {
                    const matched = await matchLocation(order.recipient.addressRaw);
                    // We only use the lookup if it has decent confidence
                    if (matched && matched.confidence >= 0.4) {
                        locationData = {
                            provinsi: matched.provinsi,
                            kota: matched.kota,
                            kecamatan: matched.kecamatan,
                            kelurahan: matched.kelurahan,
                            kodepos: matched.kodepos,
                        };
                    } else {
                        // If lookup fails or confidence is low, we follow user rule:
                        // "If AI cannot find it, leave blank"
                        // Note: We ignore any guesses the LLM might have put in order.recipient.provinsi etc.
                        console.log(`Location lookup for "${order.recipient.addressRaw}" resulted in low confidence. Blanking fields.`);
                    }
                } catch (err) {
                    console.warn('Location matching failed for LLM result:', err);
                }
            }

            return {
                ...order,
                recipient: {
                    ...order.recipient,
                    ...locationData, // This overwrites any LLM hallucinations with either table data or blanks
                },
                items: (order.items || []).map((item: any) => {
                    const qty = item.qty > 0 ? item.qty : 1;
                    let { unitPrice = 0, totalPrice = 0 } = item;

                    // Case 1: AI gave totalPrice but not unitPrice → derive unitPrice
                    if (totalPrice > 0 && unitPrice === 0) {
                        unitPrice = Math.round(totalPrice / qty);
                    }
                    // Case 2: AI gave unitPrice but not totalPrice → derive totalPrice
                    if (unitPrice > 0 && totalPrice === 0) {
                        totalPrice = unitPrice * qty;
                    }
                    // Case 3: Both present but totalPrice doesn't match → unitPrice wins
                    if (unitPrice > 0 && totalPrice > 0 && totalPrice !== unitPrice * qty) {
                        totalPrice = unitPrice * qty;
                    }

                    return {
                        ...item,
                        id: crypto.randomUUID(),
                        qty,
                        unitPrice,
                        totalPrice,
                        isManualTotal: false,
                    };
                }),
                metadata: {
                    potentialItemCount: countPotentialItems(text),
                    isAiParsed: true,
                    originalRawText: text,
                },
                status: 'unassigned',
                createdAt: Date.now(),
                logistics: {
                    originId: '',
                    finalPackedWeight: 0,
                    dimensions: { l: 0, w: 0, h: 0 },
                    volumetricWeight: 0,
                    chargeableWeight: 0,
                }
            };
        }));

        return ordersWithMetadata;
    } catch (error: any) {
        console.error('LLM Parsing Error:', error);

        // Throw a more user-friendly error or forward the specific API error
        if (error.message?.includes('quota') || error.message?.includes('429')) {
            throw new Error('Limit penggunaan AI tercapai. Silakan coba lagi nanti atau gunakan ekstraksi standar.');
        }
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            throw new Error('Gagal terhubung ke layanan AI. Periksa koneksi internet Anda.');
        }

        throw new Error(error.message || 'Gagal memproses teks dengan AI.');
    }
}
