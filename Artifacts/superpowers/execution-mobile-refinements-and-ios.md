# Execution: Mobile UI Refinement & iOS Fixes (Plan 24)

## Step 1: OrderTable Cleanup & Layout - DONE
- **Files**: `src/components/lyncis/bucket/order-table.tsx`
- **Actions**:
    - Cleaned up duplicate imports and random `Label` at bottom.
    - Restored desktop layout: Wide search on left (`flex-1`), status tabs on right.
    - Fixed syntax error (unterminated literal/corrupted file).
- **Verification**: `npm run build` passed.

## Step 2: iOS Cursor Error Mitigation - DONE
- **Files**: `src/hooks/use-lyncis-db.ts`
- **Actions**:
    - Replaced all `.reverse()`, `.orderBy()`, and `.where()` index-based cursors with JavaScript memory sorting/filtering. This is the most robust way to avoid the Safari IndexedDB "Unable to open Cursor" bug.
- **Verification**: Consistent with safest practices for mobile Safari.

## Step 3: Pagination UI Polish - DONE
- **Files**: `src/components/lyncis/bucket/order-table.tsx`
- **Actions**:
    - Fixed vertical alignment of `1 / 3` pagination text.
    - Used consistent `h-6 min-w-[24px]` containers for both numbers to ensure they are perfectly centered.
- **Verification**: Visual check (balanced layout).

## Step 4: Compact Action Bar - DONE
- **Files**: `src/components/lyncis/bucket/order-table.tsx`
- **Actions**:
    - Reduced action column width from `50px` to `40px` on mobile.
    - Centered the content (three dots) on mobile while keeping desktop alignment.
- **Verification**: Visual alignment check.
