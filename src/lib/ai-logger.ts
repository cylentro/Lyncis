'use server';

interface AiUsageLogPayload {
    moduleName: string;
    aiModel: string;
    completePrompt: string;
    actualOutput?: string;
    systemPromptLength?: number;
    userPromptLength?: number;
    inputTokens?: number;
    outputTokens?: number;
    totalTokenEstimation?: number;
    executionTimeMs?: number;
    status?: 'SUCCESS' | 'ERROR';
}

/**
 * Logs AI usage to Airtable for observability and cost tracking.
 * This is designed to be "fire-and-forget" – it should not block the main application flow.
 */
export async function logAiUsage(payload: AiUsageLogPayload): Promise<{ success: boolean; message: string }> {
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = 'prompt_log';

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return { success: false, message: 'AIRTABLE_API_KEY or AIRTABLE_BASE_ID missing.' };
    }

    // Initialize fields with everything provided
    let fields: Record<string, any> = {
        'module_name': payload.moduleName,
        'ai_model': payload.aiModel,
        'complete_prompt': payload.completePrompt,
        'timestamp': new Date().toISOString(),
    };

    // Add optional fields
    if (payload.actualOutput !== undefined) fields['actual_output'] = payload.actualOutput;
    if (payload.systemPromptLength !== undefined) fields['system_prompt_length'] = payload.systemPromptLength;
    if (payload.userPromptLength !== undefined) fields['user_prompt_length'] = payload.userPromptLength;
    if (payload.inputTokens !== undefined) fields['input_tokens'] = payload.inputTokens;
    if (payload.outputTokens !== undefined) fields['output_tokens'] = payload.outputTokens;
    if (payload.totalTokenEstimation !== undefined) fields['total_token_estimation'] = payload.totalTokenEstimation;
    if (payload.executionTimeMs !== undefined) fields['execution_time_ms'] = payload.executionTimeMs;
    if (payload.status !== undefined) fields['status'] = payload.status;

    // Remove empty values (null/undefined)
    Object.keys(fields).forEach(key => (fields[key] === undefined || fields[key] === null) && delete fields[key]);

    const maxRetries = 5;
    let attempts = 0;

    try {
        while (attempts < maxRetries) {
            attempts++;
            const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${TABLE_NAME}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ records: [{ fields }] }),
            });

            if (response.ok) {
                return { success: true, message: attempts > 1 ? `Log sent after removing ${attempts - 1} missing columns.` : 'Log sent successfully.' };
            }

            const errorData = await response.json();

            // Handle missing column error by identifying and removing the culprit field
            if (errorData.error?.type === 'UNKNOWN_FIELD_NAME') {
                const errorMessage = errorData.error.message;
                // Match field name inside double quotes: Unknown field name: "field_name"
                const match = errorMessage.match(/Unknown field name: "([^"]+)"/);

                if (match && match[1]) {
                    const failingField = match[1];
                    console.warn(`[AI-LOGGER] Removing missing Airtable column: "${failingField}" and retrying...`);
                    delete fields[failingField];
                    continue; // Loop again with reduced fields
                }
            }

            // If it's not a field error, or we couldn't parse it, stop
            console.error('[AI-LOGGER] Permanent Airtable failure:', JSON.stringify(errorData, null, 2));
            return { success: false, message: `Airtable error: ${response.status}. ${JSON.stringify(errorData)}` };
        }

        return { success: false, message: 'Too many retries stripping fields.' };
    } catch (error: any) {
        console.error('[AI-LOGGER] Runtime error during logging:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
}
