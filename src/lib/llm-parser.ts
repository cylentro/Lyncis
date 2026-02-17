import { GoogleGenerativeAI } from '@google/generative-ai';
import { JastipOrder } from '@/lib/types';
import { matchLocation } from '@/lib/location-matcher';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';
const genAI = new GoogleGenerativeAI(API_KEY);

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
2. Common Item Formats:
   - "2x Pocky Matcha @30000" -> qty: 2, name: "Pocky Matcha", unitPrice: 30000, totalPrice: 60000
   - "3 Chitato 45000" -> qty: 3, name: "Chitato", totalPrice: 45000, unitPrice: 15000 (totalPrice / qty)
   - "Pocky Matcha - 1 - 25000" -> qty: 1, name: "Pocky Matcha", unitPrice: 25000, totalPrice: 25000
   - "- Tumbler Starbucks (2pcs)" -> qty: 2, name: "Tumbler Starbucks"
3. PRICE LOGIC:
   - If you see "Qty Item Price", assume the price is the TOTAL for that quantity.
   - If you see "@" or "each", assume the price is the UNIT price.
   - ALWAYS try to populate both unitPrice and totalPrice if you have enough info.
4. If qty is missing, default to 1.
5. Extract only what is present. Use empty strings for missing text or 0 for missing numbers.
6. Return ONLY a valid JSON array. No markdown, no preamble.
`;

export async function parseWithLLM(text: string): Promise<Partial<JastipOrder>[]> {
    if (!API_KEY) {
        console.error('Gemini API Key missing (NEXT_PUBLIC_GEMINI_API_KEY)');
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nTEXT TO PARSE:\n${text}` }] }],
            generationConfig: {
                temperature: 0.1, // Low temp for extraction
                responseMimeType: 'application/json',
            },
        });

        const responseText = result.response.text();
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
    } catch (error) {
        console.error('LLM Parsing Error:', error);
        return [];
    }
}
