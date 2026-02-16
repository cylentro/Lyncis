import { GoogleGenerativeAI } from '@google/generative-ai';
import { JastipOrder } from '@/lib/types';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

const SYSTEM_PROMPT = `
You are an expert data extractor for an Indonesian Jastip (Jasa Titip) application.
Your task is to extract recipient and order information from raw WhatsApp messages and format it as a JSON array of orders.

Each order object must follow this structure (match the Lyncis internal types):
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
1. If multiple orders are in the text, return an array of objects.
2. For items, if qty is missing, default to 1.
3. If unit price is found but total is not, calculate it (qty * unitPrice).
4. Extract only what is present. Use empty strings for missing text or 0 for missing numbers.
5. Return ONLY a valid JSON array. No markdown formatting, no preamble.
`;

export async function parseWithLLM(text: string): Promise<Partial<JastipOrder>[]> {
    if (!API_KEY) {
        console.error('Gemini API Key missing (NEXT_PUBLIC_GEMINI_API_KEY)');
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

        // Add UUIDs to items as the LLM won't know about them
        return orders.map((order: any) => ({
            ...order,
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
        }));
    } catch (error) {
        console.error('LLM Parsing Error:', error);
        return [];
    }
}
