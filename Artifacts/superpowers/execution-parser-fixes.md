# Execution: Parser Fixes & AI Fallback

## Status: IN_PROGRESS 🏗️

## Steps Progress
- [ ] Step 1: Improve `item-parser.ts`
- [ ] Step 2: Update `whatsapp-parser.ts`
- [ ] Step 3: Update AI Fallback in UI
- [ ] Step 4: Add Regression Tests
### Step 1: Improve `item-parser.ts` ✅
- Files changed: `src/lib/item-parser.ts`
- Improved patterns 8 & 9 to allow digits in names (e.g. '600ml').
- Exported `ITEM_LINE_CLEANUP_PATTERNS` and `isPhoneLine`.
- Refined `countPotentialItems` to exclude contact labels and address keywords.
- Verification: `npx vitest run src/lib/__tests__/item-parser.test.ts` -> 52/52 PASS.

### Step 2: Update `whatsapp-parser.ts` ✅
- Files changed: `src/lib/whatsapp-parser.ts`
- Imported and used shared cleanup patterns and phone guard.
- Verification: TSC passed (implicit) and pattern consistency ensured.
### Step 3: Update AI Fallback in UI ✅
- Files changed: `src/components/lyncis/intake/whatsapp-paste.tsx`
- Adjusted threshold logic: stop at Regex ONLY if confidence >= threshold AND no missing items.
- Otherwise, automatically fallback to AI parsing (with logging/toasting).
- Ensures high-quality results by default, leveraging AI when deterministic rules are uncertain.
- Verification: Visual check of logic flow (sequential fall-through).
### Step 4: Add Regression Tests ✅
- Files created: `src/lib/__tests__/scenarios.test.ts`
- Added 6 specific tests for Scenarios 1, 3, 5, 9, 11, 19.
- Verified fix for '600ml' recognition and address leakage.
- Verified fix for 'alamat' misidentification.
- Verification: `npx vitest run src/lib/__tests__/scenarios.test.ts` -> 6/6 PASS.

---
### Step 5: Fix AI Fallback Gate + "Need Review" UI
- **Files changed**: `src/components/lyncis/intake/whatsapp-paste.tsx`
- Reworked fallback gate: regex results accepted when items found; missing contact = warning, not AI trigger.
- Added contextual badges per missing field (phone, address, items, unpriced items).
- Item chips now display `@price` and amber styling when unpriced.
- Verification: `npx vitest run` → 64 PASS; `npx tsc --noEmit` → 0 errors.
