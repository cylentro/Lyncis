# Plan: Fixing Parser Leakage & Complex Names (with Env-based AI Fallback)

## Goal
Fix address leakage where item lines are captured as part of the address, improve recognition of items with digits in their names (e.g., 'Aqua 600ml'), and ensure automatic AI fallback when regex confidence is below the threshold defined in the `.env` file.

## Steps

### Step 1: Manage Threshold in `.env` ✅
- **Verify `.env.local`**: Ensure `PARSER_REGEX_THRESHOLD` is present (currently set to 1.0).
- **Verify `config-actions.ts`**: confirm it correctly exposes `regexThreshold` to the client.

### Step 2: Improve `item-parser.ts` ✅
- **Pattern 8 & 9**: Update to allow digits in names if they are part of a recognized item string (e.g., 'ml', 'gr', 'pcs' or strictly followed by qty/price).
- **Export Cleanup Patterns**: Move the cleanup regex array from WhatsApp parser to `item-parser.ts` and ensure it includes the `unpricedPattern`.
- **Refine `countPotentialItems`**: Add more exclusions to avoid counting contact labels or common address words that look like items.

### Step 3: Update `whatsapp-parser.ts` ✅
- Import and use `ITEM_LINE_CLEANUP_PATTERNS` from `item-parser.ts`.
- Shared logic for item stripping before contact extraction.

### Step 4: Implement Automatic AI Fallback in UI ✅
- **Modify `whatsapp-paste.tsx`**: 
    - Change line 111 logic: only `return` if `regexConfidence >= threshold` AND `!hasMissingItems`.
    - If `regexConfidence < threshold` OR `hasMissingItems`, allow it to fall through to the `if (enableAI)` block.
    - If both Regex and AI fail to exceed threshold, show the best available result (likely AI).

### Step 5: Add Regression Tests ✅
- Create a test file `src/lib/__tests__/scenarios.test.ts` for the user's specific scenarios (1, 3, 5, 9, 11, 19).

## Verification
- Run Vitest: `npx vitest run src/lib/__tests__/item-parser.test.ts`
- Run Vitest for new scenarios: `npx vitest run src/lib/__tests__/scenarios.test.ts`
- Run TSC: `npx tsc --noEmit`
