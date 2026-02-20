# Review: Insurance Categorization & Shadow Removal

## Checklist
- [x] Removed shadow utility classes (`shadow-xs`, etc.) from related components for a flatter UI.
- [x] Insurance flow maps exactly back to existing `order.items`.
- [x] Pre-existing items show names, quantities, and pre-inputted total prices as read-only labels.
- [x] Only the category selection (Kategori) is editable for insurance.
- [x] AI functionality specifically categorizes items rather than overwriting item descriptions/prices.
- [x] Type checking passes perfectly.

## Issues by Severity

### Blocker
- None. Ensure the `lib/types.ts` database update (`itemId`) logic is working robustly on live data. 

### Major
- None.

### Minor
- Because `itemId` is retroactively added to `insurance.items` for saved orders, some extremely old cached orders might theoretically lack an `itemId`, but our logic falls back cleanly to the index (`o.items[idx]?.id`), preventing corruption.

### Nit
- The AI prompt parses item categories efficiently, but might be slightly limited by Gemini's generation speed. `categorizeOrderItems` was created strictly for this purpose to be as fast as possible.
