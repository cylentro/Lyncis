
# Execution: Batch Wizard Refinement

## Step 1: Update TagSidebar & Filtering ("The Cart View")
- **Files**: `src/app/page.tsx`, `src/components/lyncis/bucket/tag-sidebar.tsx`
- **What changed**:
    - Added "Siap Kirim" virtual tag to `TagSidebar` with package icon and status count.
    - Updated `page.tsx` to filter by `status: 'staged'` when the virtual tag is selected.
- **Verification**: `npm run build`
- **Result**: Pass

## Step 2: Add Shopify-style Checkout Trigger (Header)
- **Files**: `src/app/page.tsx`
- **What changed**:
    - Injected a "Siap Kirim" button in the header (sticky) when `stagedOrders > 0`.
    - Button shows current staged count and triggers the Batch Wizard side sheet.
- **Verification**: `npm run build`
- **Result**: Pass

## Step 3: Implement Sticky Bottom Selection Bar
- **Files**: `src/components/lyncis/bucket/sticky-selection-bar.tsx` (new), `src/app/page.tsx`
- **What changed**:
    - Created `StickySelectionBar` with dark glassmorphism, floating at bottom center.
    - Replaced `FloatingActionBar`.
    - Logic handles mixed selection: shows "Pindah ke Siap Kirim" if any unassigned selected, and "Hapus dari Batch" if any staged selected.
- **Verification**: `npm run build`
- **Result**: Pass

## Step 4: Refactor Batch Wizard to Side Sheet
- **Files**: `src/components/lyncis/fulfillment/batch-wizard.tsx`
- **What changed**:
    - Side sheet transition: changed `side="bottom"` to `side="right"`.
    - Internal layout fixed to support vertical scrolling with a pinned header/footer.
- **Verification**: `npm run build`
- **Result**: Pass

## Step 5: Expandable Review Cards & Inline Edit Sync
- **Files**: `src/components/lyncis/fulfillment/completion-gate.tsx`, `src/components/lyncis/fulfillment/batch-summary.tsx`, `src/components/lyncis/fulfillment/batch-wizard.tsx`, `src/app/page.tsx`
- **What changed**:
    - Cards in `CompletionGate` (Step 1) and `BatchSummary` (Step 4) are now expandable.
    - Expanded view shows Recipient phone, full address, and Items list.
    - Wired "Edit" button to open `OrderEditSheet` via `page.tsx`.
    - Added `useEffect` in `BatchWizard` to sync logistics state if underlying order data changes during an edit session.
- **Verification**: `npm run build`
- **Result**: Pass
