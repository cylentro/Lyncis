'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { JastipOrder } from '@/lib/types';
import { matchLocation } from '@/lib/location-matcher';
import { countPotentialItems } from '@/lib/whatsapp-parser';
import { logAiUsage } from '@/lib/ai-logger';
import { v4 as uuidv4 } from 'uuid';

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

export async function parseWithLLM(text: string, moduleName = 'whatsapp parser'): Promise<Partial<JastipOrder>[]> {
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

        const promptContent = `${prompt}\n\nINPUT:\n${text}`;
        const startTime = Date.now();
        let result;
        try {
            result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: promptContent }]
                }],
                generationConfig,
            });
        } catch (apiError: any) {
            // Log full failure
            logAiUsage({
                moduleName,
                aiModel: LLM_MODEL,
                completePrompt: promptContent,
                actualOutput: apiError.message,
                status: 'ERROR',
                executionTimeMs: Date.now() - startTime,
            });
            throw apiError;
        }

        const endTime = Date.now();
        const usage = result.response.usageMetadata;
        const responseRaw = result.response.text();

        // Fire and forget logging
        logAiUsage({
            moduleName,
            aiModel: LLM_MODEL,
            completePrompt: promptContent,
            actualOutput: responseRaw,
            inputTokens: usage?.promptTokenCount,
            outputTokens: usage?.candidatesTokenCount || (usage?.totalTokenCount && usage?.promptTokenCount ? usage.totalTokenCount - usage.promptTokenCount : undefined),
            executionTimeMs: endTime - startTime,
            status: 'SUCCESS',
        });

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
                        id: uuidv4(),
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

/**
 * Parses multiple independent blocks of text in a single AI call to save time and tokens.
 * Expected to return an array of orders corresponding to the input blocks.
 */
export async function parseMultipleBlocksWithLLM(blocks: string[], moduleName = 'batch parser'): Promise<Partial<JastipOrder>[]> {
    if (!API_KEY) {
        throw new Error('Ekstraksi AI tidak tersedia (API Key belum dikonfigurasi).');
    }
    if (blocks.length === 0) return [];

    // Combine blocks with clear delimiters
    const combinedText = blocks.map((block, index) => `--- ORDER ${index + 1} ---\n${block.trim()}`).join('\n\n');

    // Create a modified prompt ensuring the AI understands it's a batch
    const BATCH_INSTRUCTION = `This input contains ${blocks.length} clear distinct orders separated by "--- ORDER X ---". You MUST return exactly ${blocks.length} items in the JSON array, preserving the exact order.`;

    // We reuse the core parsing logic by wrapping the combined text with the batch instruction
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

    const basePrompt = isGemini ? GEMINI_PROMPT : GEMMA_PROMPT;
    const prompt = `${basePrompt}\n\nIMPORTANT BATCH INSTRUCTIONS:\n${BATCH_INSTRUCTION}`;
    const promptContent = `${prompt}\n\nINPUT:\n${combinedText}`;
    const startTime = Date.now();

    try {
        let result;
        try {
            result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: promptContent }]
                }],
                generationConfig,
            });
        } catch (apiError: any) {
            logAiUsage({
                moduleName,
                aiModel: LLM_MODEL,
                completePrompt: promptContent,
                actualOutput: apiError.message,
                status: 'ERROR',
                executionTimeMs: Date.now() - startTime,
            });
            throw apiError;
        }

        const endTime = Date.now();
        const usage = result.response.usageMetadata;
        const responseRaw = result.response.text();

        logAiUsage({
            moduleName,
            aiModel: LLM_MODEL,
            completePrompt: promptContent,
            actualOutput: responseRaw,
            inputTokens: usage?.promptTokenCount,
            outputTokens: usage?.candidatesTokenCount || (usage?.totalTokenCount && usage?.promptTokenCount ? usage.totalTokenCount - usage.promptTokenCount : undefined),
            executionTimeMs: endTime - startTime,
            status: 'SUCCESS',
        });

        const responseText = isGemini ? responseRaw : cleanJsonString(responseRaw);

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            console.error('Initial JSON Parse failed for batch, trying to rescue...', responseText);
            const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw e;
            }
        }

        const orders = Array.isArray(parsed) ? parsed : [parsed];

        // Process each order (same as single parse)
        const ordersWithMetadata = await Promise.all(orders.map(async (order: any, index: number) => {
            let locationData = {
                provinsi: '',
                kota: '',
                kecamatan: '',
                kelurahan: '',
                kodepos: '',
            };

            if (order.recipient?.addressRaw) {
                try {
                    const matched = await matchLocation(order.recipient.addressRaw);
                    if (matched && matched.confidence >= 0.4) {
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

            // Restore original raw text for this specific block to metadata
            const originalBlockSource = blocks[index] || combinedText;

            return {
                ...order,
                recipient: {
                    ...order.recipient,
                    ...locationData,
                },
                items: (order.items || []).map((item: any) => {
                    const qty = item.qty > 0 ? item.qty : 1;
                    let { unitPrice = 0, totalPrice = 0 } = item;

                    if (totalPrice > 0 && unitPrice === 0) {
                        unitPrice = Math.round(totalPrice / qty);
                    }
                    if (unitPrice > 0 && totalPrice === 0) {
                        totalPrice = unitPrice * qty;
                    }
                    if (unitPrice > 0 && totalPrice > 0 && totalPrice !== unitPrice * qty) {
                        totalPrice = unitPrice * qty;
                    }

                    return {
                        ...item,
                        id: uuidv4(),
                        qty,
                        unitPrice,
                        totalPrice,
                        isManualTotal: false,
                    };
                }),
                metadata: {
                    potentialItemCount: countPotentialItems(originalBlockSource),
                    isAiParsed: true,
                    originalRawText: originalBlockSource,
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

        // Safety check to ensure length matches
        if (ordersWithMetadata.length !== blocks.length) {
            console.warn(`Batch AI warning: requested ${blocks.length} but got ${ordersWithMetadata.length}`);
        }

        return ordersWithMetadata;
    } catch (error: any) {
        console.error('LLM Batch Parsing Error:', error);

        if (error.message?.includes('quota') || error.message?.includes('429')) {
            throw new Error('Limit penggunaan AI tercapai. Silakan coba lagi nanti atau gunakan ekstraksi standar.');
        }
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
            throw new Error('Gagal terhubung ke layanan AI. Periksa koneksi internet Anda.');
        }

        throw new Error(error.message || 'Gagal memproses batch teks dengan AI.');
    }
}

/**
 * Specifically categorizes existing items into insurance categories using AI.
 */
export async function categorizeOrderItems(
    items: { id: string; name: string }[],
    categories: { code: string; label: string }[]
): Promise<{ id: string; categoryCode: string }[]> {
    if (!API_KEY) {
        throw new Error('Ekstraksi AI tidak tersedia.');
    }

    const categoryListStr = categories.map(c => `${c.code}: ${c.label}`).join('\n');
    const itemsListStr = items.map(i => `${i.id}: ${i.name}`).join('\n');

    const model = genAI.getGenerativeModel({ model: LLM_MODEL });
    const isGemini = AI_MODE === 'gemini';
    const categoryAiThreshold = parseFloat(process.env.CATEGORY_AI_THRESHOLD || '0.7');

    const prompt = `Assign the most appropriate insurance category for each item below.
You MUST process EVERY item in the list and return its corresponding category.
If a category is unclear, default to the first or most generic category.
You MUST also provide a confidence score from 0.0 to 1.0 for each assignment.

ALLOWED CATEGORIES:
${categoryListStr}

ITEMS TO CATEGORIZE:
${itemsListStr}

Return a pure JSON Array, format required: [{"id": "item-id-1", "categoryCode": "CODE", "confidence": 0.9}]`;

    const generationConfig: any = {
        temperature: 0.1,
        responseMimeType: isGemini ? 'application/json' : 'text/plain',
    };

    if (isGemini) {
        generationConfig.responseSchema = {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    id: { type: 'STRING' },
                    categoryCode: { type: 'STRING' },
                    confidence: { type: 'NUMBER' },
                },
                required: ['id', 'categoryCode', 'confidence'],
            },
        };
    }

    const promptContent = prompt;
    const startTime = Date.now();

    try {
        let result;
        try {
            result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [{ text: promptContent }]
                }],
                generationConfig,
            });
        } catch (apiError: any) {
            logAiUsage({
                moduleName: 'item category parser',
                aiModel: LLM_MODEL,
                completePrompt: promptContent,
                actualOutput: apiError.message,
                status: 'ERROR',
                executionTimeMs: Date.now() - startTime,
            });
            throw apiError;
        }

        const endTime = Date.now();
        const usage = result.response.usageMetadata;
        const responseRaw = result.response.text();

        logAiUsage({
            moduleName: 'item category parser',
            aiModel: LLM_MODEL,
            completePrompt: promptContent,
            actualOutput: responseRaw,
            inputTokens: usage?.promptTokenCount,
            outputTokens: usage?.candidatesTokenCount || (usage?.totalTokenCount && usage?.promptTokenCount ? usage.totalTokenCount - usage.promptTokenCount : undefined),
            executionTimeMs: endTime - startTime,
            status: 'SUCCESS',
        });

        const responseText = isGemini ? responseRaw : cleanJsonString(responseRaw);

        const parsed = JSON.parse(responseText);
        const resultsArray = Array.isArray(parsed) ? parsed : [parsed];

        // Apply confidence threshold guardrail
        return resultsArray.map((res: any) => ({
            id: res.id,
            categoryCode: (res.confidence !== undefined && parseFloat(res.confidence) < categoryAiThreshold) ? "" : res.categoryCode,
        }));
    } catch (error) {
        console.error('Insurance AI Parsing Error:', error);
        throw new Error('Gagal mengekstrak kategori asuransi dengan AI.');
    }
}
