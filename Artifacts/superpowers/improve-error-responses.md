# Plan: Improve WhatsApp Parser Error Messaging

Improve the user experience when AI parsing fails or is unavailable by providing more specific and helpful error messages.

## Goal
- Distinguish between "AI service failure" and "bad text format".
- Provide helpful suggestions to the user on how to fix extraction issues.
- Avoid blaming the user for system-level failures.

## Steps

### 1. Update `src/lib/llm-parser.ts`
- Modify `parseWithLLM` to throw errors instead of returning an empty array when an exception occurs. This allows the caller (`whatsapp-paste.tsx`) to handle and report the specific error.

### 2. Update `src/components/lyncis/intake/whatsapp-paste.tsx`
- Implement better error handling in `handleSmartParse`:
    - Catch specific AI errors (e.g., quota exceeded, service unavailable) and show a descriptive toast.
    - Track if AI was attempted and failed terminally.
    - Update the final "Last Resort" error message to be more descriptive and helpful.
- Suggest specific formatting tips if no data is found even after all attempts.

## Verification
- **Test Case 1: AI Unavailable** (e.g. invalid API key) 
    - Expected: Message indicating AI service issue, falling back to regex.
- **Test Case 2: Junk Text** 
    - Expected: Helpful message suggesting how to format the text correctly (e.g., "Must include Name and Item list").
- **Test Case 3: Successful AI/Regex**
    - Expected: Existing success messages remain functional.

## Artifacts
- Plan written to `artifacts/superpowers/improve-error-responses.md`
