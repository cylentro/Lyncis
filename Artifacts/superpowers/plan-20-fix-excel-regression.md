# Sync Excel AI Fallback with PARSER_REGEX_THRESHOLD

## Goal Description
Fix the Excel parser to strictly respect the `PARSER_REGEX_THRESHOLD` from the environment and align its logic 1:1 with the WhatsApp parser. The current Excel implementation is "too aggressive" because it inserts a placeholder item ("Barang Impor") when native mapping fails, which tricks the fallback system into thinking the parse was successful.

## Proposed Changes

### 1. Fix Excel Placeholder Bug
#### [MODIFY] `src/lib/excel-to-orders.ts`
- **Pass 1 Refactor**: Stop inserting the fallback "Barang Impor" item if no items are found. This ensures `order.items.length === 0` correctly triggers the AI fallback when native mapping fails, matching the WhatsApp parser's behavior.
- **Global Row Context**: Use all non-empty values in a row (`Object.values(row).join('\n')`) for `countPotentialItems` so that hidden items in unmapped columns are detected.

### 2. Synchronize AI Fallback Logic
#### [MODIFY] `src/lib/excel-to-orders.ts`
- **Logic Alignment**: Update the `needsAiFallback` condition to exactly match the implementation used in WhatsApp:
  `const needsAiFallback = !order.items?.length || hasMissingItems || (currentConfidence < threshold && currentConfidence < 0.6);`
- This ensures that if the native Excel mapping is weak (below `PARSER_REGEX_THRESHOLD` and below the 0.6 safety guard), it falls back to bulk AI.

### 3. Pass Threshold to Excel
#### [MODIFY] `src/components/lyncis/intake/excel-upload.tsx`
- Ensure the `threshold` being passed to `convertRowsToOrders` is derived from `config.regexThreshold` (which is populated by `PARSER_REGEX_THRESHOLD` from `.env`).

## Verification Plan

### Automated
- `npx tsc --noEmit`

### Manual
1. **Placeholder Test**: Import an Excel row where the item name column is empty/nonsense. Pass 1 should now result in 0 items, which must trigger an AI fallback.
2. **Threshold Test**: With `PARSER_REGEX_THRESHOLD=1.0`, verify that rows with weak native mapping (e.g. missing city/province) now trigger the AI extraction.
3. **Consistency Check**: Verify that the Excel and WhatsApp parsers now react identically to the same data (one via Paste, one via Upload).
