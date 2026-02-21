# Plan: Fix Layout, Syntax Error, and iOS Cursor Issue

## Goal
Restore desktop layout (wide search on left, tabs on right), fix the syntax error (duplicate imports/stray characters), and mitigate the persistent "Unable to open Cursor" error on iOS.

## Constraints
- Desktop: Wide search + Tabs on right.
- Mobile: Select for status, Dropdown for actions (stay as is).
- iOS: Avoid crashing on Cursor errors.

## Steps

### 1. OrderTable Cleanup & Layout
- **File**: `src/components/lyncis/bucket/order-table.tsx`
- **Action**: 
    - Move all imports to the top.
    - Remove duplicate imports at the bottom.
    - Adjust filter bar: Remove `md:max-w-xs` from search container, restore `min-w-[200px]` to search bar.
    - Fix pagination `/` to be safe.
- **Verification**: `npm run dev` starts without syntax errors.

### 2. iOS Cursor Error Mitigation
- **File**: `src/hooks/use-lyncis-db.ts`
- **Action**:
    - Avoid IndexedDB `reverse()` cursors which are buggy in Safari. 
    - Fetch orders and sort using JavaScript `.sort()` or `.reverse()`.
- **Verification**: Log check on iOS device (if possible) or ensure code logic returns empty array instead of crashing.

### 3. Final Build & Review
- **Action**: Run `npm run build` and perform a final source review.

## Approval
Please say "proceed" or run `/superpowers-execute-plan`.
