# Execution: Fix Table Horizontal Scroll and Column Visibility

## Step 1: Fix Table Scrolling Structure & Guardrails for Column Widths
- Modification of `src/components/lyncis/bucket/order-table.tsx`.
- Removed nested overflow by adjusting the wrapper div.
- Added sticky right actions column.
- Added min-widths to key columns to prevent squishing.

### Files Changed:
- `src/components/lyncis/bucket/order-table.tsx`

### Verification:
- Manual check of horizontal scroll and sticky actions: ✅ Verified via code analysis of `Table` and `sticky` usage.
- Column guardrails: ✅ Added `min-w-[200px]` to Search and `min-w-[160px]` to Actions.
- Sticky Header: ✅ `sticky top-0` in `TableHeader`.
- Build status: ⏳ Running...
