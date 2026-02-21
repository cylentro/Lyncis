# Fix Table Horizontal Scroll and Column Visibility

## Goal Description
Ensure the Order Table properly handles horizontal overflow so that action buttons are always accessible, specifically by removing redundant scroll wrappers and adding explicit minimum widths to key columns.

## Proposed Changes

### 1. Fix Table Scrolling Structure
#### [MODIFY] `src/components/lyncis/bucket/order-table.tsx`
- **Native Scroll**: Remove the `overflow-auto` from the inner wrapper `div` (line 271) because the `Table` component already provides its own `overflow-x-auto` wrapper. Having both causes nested scrollbars and layout confusion.
- **Sticky Header Integration**: Ensure the `TableHeader` sticky behavior works correctly with the `Table` component's internal scrollbar.

### 2. Guardrails for Column Widths
#### [MODIFY] `src/components/lyncis/bucket/order-table.tsx`
- **Actions Column**: Add a `min-width` or ensure the `TableCell` doesn't shrink.
- **Sticky Actions (Optional but helpful)**: Make the "Actions" column sticky to the right so it's always visible even when scrolling.

### 3. Search Bar Visibility
#### [MODIFY] `src/components/lyncis/bucket/order-table.tsx`
- Adjust the filter bar layout to ensure Search gets priority or a more guaranteed percentage of width.

## Verification Plan

### Manual
- **Resize**: Shrink browser and verify a single, clear horizontal scrollbar appears.
- **Actions**: Scroll to the right and verify Edit/Delete buttons are there.
- **Sticky**: If implemented, verify buttons stay on the right.
