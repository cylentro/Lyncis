# AI Logging Implementation Plan

## Goal Description
Implement a generic logger that records all LLM usage (prompts, completion tokens, execution time, etc.) to the `token_usage` Airtable base inside the `prompt_log` table. This provides observability into token costs, model performance, and prompt effectiveness.

> [!IMPORTANT]  
> To complete this, you must have the **Airtable Base ID** for your `token_usage` base. 
> You can find this in the Airtable API documentation (usually starts with `app...`).

## Proposed Changes

### 1. Environment Variables
#### [MODIFY] `.env.local.example`
- Add `AIRTABLE_BASE_ID=app...` as a required environment variable alongside `AIRTABLE_API_KEY`.

### 2. Airtable Logger Service
#### [NEW] `src/lib/ai-logger.ts`
- Create an asynchronous, non-blocking function `logAiUsage(payload)`.
- Use the native `fetch` API to send a POST request to `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/prompt_log`.
- Mapping payload to your exact table columns:
  - `module_name`: "whatsapp parser", "excel parser", or "item category parser"
  - `ai_model`: Model name (e.g., gemini-1.5-flash)
  - `complete_prompt`: The full prompt sent
  - `actual_output`: The raw text output
  - `input_tokens`: From `usageMetadata.promptTokenCount`
  - `output_tokens`: From `usageMetadata.candidatesTokenCount`
  - `execution_time_ms`: Time taken for the API to respond
  - `status`: "SUCCESS" or "ERROR"

### 3. Integrations
#### [MODIFY] `src/lib/llm-parser.ts`
- **In `parseWithLLM`:**
  - Track `startTime` before `model.generateContent()`.
  - Extract `.usageMetadata` from the `result.response`.
  - Call `logAiUsage` with `status: 'SUCCESS'` (fire-and-forget: `catch` any errors so it doesn't break the app if Airtable fails).
  - Modify the catch block to log `status: 'ERROR'` along with the error message as `actual_output`.
- **In `categorizeOrderItems`:**
  - Track `startTime` and extract `.usageMetadata`.
  - Call `logAiUsage` with the "item category parser" module name.

## Verification Plan
### Automated Tests
- Setup type checking `npx tsc --noEmit` and `npm run build` to ensure the new logger integrates smoothly without typing issues.

### Manual Verification
1. **Successful Parsing Log**
   - Provide a dummy WhatsApp text, process it via the UI.
   - Verify the `prompt_log` table in Airtable receives a new row with accurate `execution_time_ms` and `input_tokens`/`output_tokens`.
2. **Error Logging**
   - Disconnect the internet or provide an invalid `LLM_MODEL` name.
   - Trigger a parsing request.
   - Verify Airtable receives a row with `status: "ERROR"` and the error message documented in `actual_output`. 

## User Review Required
Please review the plan. Once approved, I will implement it.
Also, **please add your `AIRTABLE_BASE_ID` to your `.env.local`** so the code can function correctly!
