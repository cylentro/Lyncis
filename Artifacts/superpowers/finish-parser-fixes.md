# Finish: Parser Fixes & AI Fallback

## Summary
Successfully improved the parser's accuracy by addressing item-address leakage and enhancing recognition of items with complex names (e.g., digits like '600ml'). Implemented automatic AI fallback in the UI when regex confidence is insufficient.

## Changes
- **Shared Library (`item-parser.ts`)**:
    - Enhanced Patterns 1, 4, 6, 7, 8, 9 to support decimal prices (e.g., '2.5k') and digits in names.
    - Improved `isContactLine` to recognize unlabeled address fields (e.g., 'alamat taman...').
    - Synchronized `ITEM_LINE_CLEANUP_PATTERNS` with extraction logic.
- **WhatsApp Parser (`whatsapp-parser.ts`)**:
    - Integrated shared patterns and utility functions.
    - Fixed bug where header-embedded items (e.g., 'Pesanan: 1x...') were missed.
- **UI (`whatsapp-paste.tsx`)**:
    - Modified logic to automatically trigger AI fallback if Regex confidence < threshold (from `.env`) OR if items are missing based on heuristic.
- **Testing**:
    - 52 unit tests passing.
    - 6 new regression scenario tests passing (covering all user-reported edge cases).

## Verification Results
- `npx vitest run src/lib/__tests__/item-parser.test.ts`: 52 PASS
- `npx vitest run src/lib/__tests__/scenarios.test.ts`: 6 PASS
- `npx tsc --noEmit`: 0 new errors.

## Manual Validation
- Test pasting "alamat taman duren sawit" -> should be address.
- Test pasting "Aqua 600ml 6 18000" -> should be item.
- Verify that if `.env` threshold is high (e.g. 1.0), AI fallback triggers for most inputs.
