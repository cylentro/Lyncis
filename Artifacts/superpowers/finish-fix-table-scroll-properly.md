# Finish: Fix Table Horizontal Scroll and Column Visibility

## Summary of Changes
- Adjusted `OrderTable` structure to fix horizontal scrolling issues.
- Optimized filter bar: Added `min-w-[200px]` to Search input and `flex-shrink-0` to status filters to prevent the search bar from being crushed on smaller screens.
- Cleaned up scrolling: Removed `overflow-auto` from the inner wrapper and used `overflow-y-auto` to allow the `Table` component's native horizontal scroll to work without nesting.
- Enhanced accessibility: Implemented a **sticky actions column** (right-aligned) with opaque backgrounds and shadow to ensure Edit/Delete buttons are always reachable regardless of horizontal scroll position.
- Theme refinement: Used dynamic backgrounds for sticky cells to maintain visual consistency with selected or warned rows.

## Verification Results
- **Build**: ✅ Passed (`npm run build`).
- **Scroll Test**: ✅ Confirmed `Table` wrapper provides `overflow-x-auto` while parent handles `overflow-y-auto`.
- **Sticky Test**: ✅ Sticky classes (`sticky right-0`) and z-indexing (`z-30`/`z-10`) correctly applied for overlay.

## Follow-ups
- Monitor if the horizontal scrollbar at the bottom of the table is acceptable when many rows are present (standard behavior).
