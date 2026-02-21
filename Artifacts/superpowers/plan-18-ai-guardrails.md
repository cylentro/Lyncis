# AI Guardrails Implementation Plan

## Goal Description
Implement strict guardrails to control when and how AI is invoked for order parsing (WhatsApp and Excel) and item category assignment. This reduces unnecessary token usage, prevents AI hallucinations on malformed data, and ensures bulk processing is done efficiently.

## Constraint
DO NOT TOUCH ANY CODE UNRELATED TO THIS IMPROVEMENT
YOU ARE STRICTLY TO MODIFY THE CODE RELATED TO THIS IMPROVEMENT
YOU ARE NOT ALLOWED TO TOUCH ANY UI

## Proposed Changes

### 1. Environment Variables
#### [MODIFY] `.env.local.example` and `.env.local`
- Add `CATEGORY_AI_THRESHOLD=0.7` to configure the confidence threshold for item category assignment.
- Add `PARSER_AI_THRESHOLD=0.8` (if not already handled by existing logic).

### 2. Item Category Assignment Guardrail
#### [MODIFY] `src/lib/llm-parser.ts`
- Update the `categorizeOrderItems` prompt to require AI to output a `confidence` field (0.0 to 1.0) along with the `categoryCode`.
- Update the generative schema to include `confidence: { type: "NUMBER" }`.
- Extract `process.env.CATEGORY_AI_THRESHOLD` (default `0.7`).
- In the mapping phase of `categorizeOrderItems`, if the AI's `confidence` is lower than the threshold, set the `categoryCode` to an empty string (`""`).

### 3. Bulk AI Evaluation (WhatsApp & Excel)
#### [MODIFY] `src/lib/llm-parser.ts`
- Add a new helper function `parseMultipleBlocksWithLLM(blocks: string[]): Promise<Partial<JastipOrder>[]>`.
  - Joins multiple unparsed text blocks with clear delimiters (e.g., `--- ORDER 1 ---`, `--- ORDER 2 ---`).
  - Instructs the AI (in `GEMINI_PROMPT`) to return an array of exactly `N` elements matching the order of the inputs.
  - Ensures exactly 1 AI call is made for `N` low-confidence items.

#### [MODIFY] `src/lib/excel-to-orders.ts`
- Change `convertRowsToOrders` to a 2-pass system:
  - **Pass 1:** Run all rows through regex/mapping. Calculate confidence and check for `recipient.phone`.
  - If a row has `confidence < threshold` **AND** `!!recipient.phone`, flag it for AI fallback.
  - If a row has `confidence < threshold` **BUT NO phone number**, accept the regex output (do not use AI).
  - **Pass 2:** Collect all flagged row contexts. Send them as a batch to the new `parseMultipleBlocksWithLLM`. 
  - Merge the AI parsed results back into the original array exactly at their original indexes.

#### [MODIFY] `src/components/lyncis/intake/whatsapp-paste.tsx`
- Instead of taking the entire raw text and passing it to `parseWithLLM(text)` on fallback, use the `regexResults` which already have `metadata.originalRawText`.
- **Pass 1:** Identify which orders in `regexResults` need AI (missing items or `confidence < 0.8`).
- Apply rule: If an order block needs AI **BUT has NO phone number** (`!order.recipient?.phone`), skip AI for that block.
- **Pass 2:** Send all qualifying blocks as an array to `parseMultipleBlocksWithLLM`.
- Merge the improved AI results back into the array, keeping the good regex results untouched.

## Verification Plan
### Automated Tests
- N/A (We will run `npm run build` and `npx tsc --noEmit` to ensure type safety).

### Manual Verification
1. **Category Assignment:** Add an item with an ambiguous name (e.g., "Barang Aneh"). Run `Isi dengan AI`. Verify it leaves the category blank if confidence is low, instead of hallucinating.
2. **Excel/WA Phone Guardrail:** Input an Excel row with messy data but NO phone number. Verify it does not trigger an AI loading state and just returns the regex warning.
3. **Bulk AI Call:** Input 3 messy WA orders with phone numbers. Verify via network tab or console logs that only **ONE** AI request is made containing all 3 blocks, and the sequence of the output perfectly patches the UI list.
