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

const SYSTEM_PROMPT = `
You are an expert data extractor for an Indonesian Jastip (Jasa Titip) application.
Your task is to extract recipient and order information from raw WhatsApp messages and format it as a JSON array of orders.

Each order object must follow this structure:
{
  "recipient": {
    "name": "Extracted Name",
    "phone": "Extracted Phone (numbers only)",
    "addressRaw": "Full raw address extracted",
    "provinsi": "",
    "kota": "",
    "kecamatan": "",
    "kelurahan": "",
    "kodepos": ""
  },
  "items": [
    {
      "name": "Item Name",
      "qty": 1,
      "unitPrice": 0,
      "totalPrice": 0,
      "rawWeightKg": 0
    }
  ],
  "tag": "" 
}

RULES:
1. Handle multiple orders separated by newlines or markers.
2. Common Item Formats (EXTREMELY DIVERSE):
   - "2x Pocky Matcha @30,000" -> qty: 2, name: "Pocky Matcha", unitPrice: 30000
   - "3 Indomie Goreng Rendang 9.000" -> qty: 3, name: "Indomie Goreng Rendang", totalPrice: 9000, unitPrice: 3000
   - "Indomie Kuah Soto 9000" -> qty: 1, name: "Indomie Kuah Soto", unitPrice: 9000
   - "2 Teh Botol 250ml 5k" -> qty: 2, name: "Teh Botol 250ml", totalPrice: 5000
   - "3 Aqua 600ml @3k" -> qty: 3, name: "Aqua 600ml", unitPrice: 3000
   - "Pocky Matcha - 1 - 25.000" -> qty: 1, name: "Pocky Matcha", unitPrice: 25000
   - "- Starbucks Tumbler (2pcs)" -> qty: 2, name: "Starbucks Tumbler"
   - "Chitato (15.5k)" -> qty: 1, name: "Chitato", unitPrice: 15500
   - "3. Abon Sapi @50,000 (2)" -> qty: 2, name: "Abon Sapi", unitPrice: 50000
   - "Pocky Matcha @30000 2x" -> qty: 2, name: "Pocky Matcha", unitPrice: 30000

3. PRICE & QTY LOGIC:
   - "k" suffix means thousand (e.g., 5k = 5000, 3.5k = 3500).
   - "dots" (.) and "commas" (,) are often used as thousand separators in IDR (e.g., 10.000 or 10,000 = 10k).
   - If you see "Qty Name Price", usually Price is the TOTAL for that quantity.
   - If you see "@" or "each" or "/pc", Price is the UNIT price.
   - If quantity is missing but a price exists, default qty to 1.
   - If a line looks like item but has no price, extract the name and qty anyway (price = 0).

4. Return ONLY a valid JSON array. No markdown, no preamble. Ensure name and items are never null.
`;

export async function parseWithLLM(text: string): Promise<Partial<JastipOrder>[]> {
    if (!API_KEY) {
        throw new Error('Ekstraksi AI tidak tersedia (API Key belum dikonfigurasi).');
    }

    try {
        const model = genAI.getGenerativeModel({ model: LLM_MODEL });

        // Configuration varies by mode
        const generationConfig: any = {
            temperature: 0.1,
        };

        // Gemma doesn't support responseMimeType: 'application/json' via API yet
        if (AI_MODE === 'gemini') {
            generationConfig.responseMimeType = 'application/json';
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nTEXT TO PARSE:\n${text}` }] }],
            generationConfig,
        });

        const responseRaw = result.response.text();
        const responseText = AI_MODE === 'gemma' ? cleanJsonString(responseRaw) : responseRaw;

        const parsed = JSON.parse(responseText);

        // Ensure it's an array
        const orders = Array.isArray(parsed) ? parsed : [parsed];

        // Add UUIDs to items and match location data
        const ordersWithMetadata = await Promise.all(orders.map(async (order: any) => {
            // Try to match location from the address
            let locationData = {
                provinsi: order.recipient?.provinsi || '',
                kota: order.recipient?.kota || '',
                kecamatan: order.recipient?.kecamatan || '',
                kelurahan: order.recipient?.kelurahan || '',
                kodepos: order.recipient?.kodepos || '',
            };

            if (order.recipient?.addressRaw) {
                try {
                    const matched = await matchLocation(order.recipient.addressRaw);
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
                    console.warn('Location matching failed for LLM result:', err);
                }
            }

            return {
                ...order,
                recipient: {
                    ...order.recipient,
                    ...locationData,
                },
                items: (order.items || []).map((item: any) => ({
                    ...item,
                    id: crypto.randomUUID(),
                    isManualTotal: item.totalPrice > 0 && item.unitPrice === 0,
                })),
                metadata: {
                    potentialItemCount: countPotentialItems(text),
                    isAiParsed: true,
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
