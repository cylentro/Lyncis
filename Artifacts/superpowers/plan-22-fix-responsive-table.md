# Fix Responsive Layout for Order Table (v2)

## Goal Description
Improve the responsive design of the Order Table. Ensure the table content scrolls horizontally to reveal action buttons on smaller screens, and ensure the search bar remains a usable size.

## Proposed Changes

### 1. Robust Filter Bar (Search & Tabs)
#### [MODIFY] `src/components/lyncis/bucket/order-table.tsx`
- **Search Logic**: Add a `min-w-[200px]` or similar to the search input container.
- **Header Layout**: Update the `md:flex-row` trigger. On screens where the search bar and tabs clash, allow them to stack or wrap intelligently.

### 2. Table Horizontal Scrolling (Primary Fix)
#### [MODIFY] `src/components/lyncis/bucket/order-table.tsx`
- **Table Container**: Ensure the parent of `Table` (line 271) has `overflow-x-auto`.
- **Minimum Width**: Add `min-w-[1000px]` to the `Table` element itself. This forces a horizontal scrollbar when the container is narrower than 1000px, which preserves the column layout and keeps the **Action Buttons** (rightmost column) accessible.

### 3. Pagination Polish
#### [MODIFY] `src/components/lyncis/bucket/order-table.tsx`
- **Pagination Area**: Update the footer to stack gracefully on mobile screens.

## Verification Plan

### Manual
- **Browser Resize**: Drag the browser window to be narrow.
- **Verify Table Scroll**: Confirm a horizontal scrollbar appears for the table entries and that action buttons can be reached.
- **Verify Search**: Confirm the search bar is still large enough to type in.

### Automated
- `npx tsc --noEmit`
