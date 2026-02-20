
## Goal
Overhaul the Batch Wizard to use a **Side Sheet** layout, replace the FAB with a **Sticky Bottom Bar**, clarify the **Cart Model** (where "Siap Kirim" acts as a shopping cart), and implement **Dual Mixed Selection**.

## Assumptions
-   The current codebase uses Shadcn UI components.
-   The `TagSidebar` can accept a static prepended item for "Siap Kirim" (or similar).
-   `useStagedOrders` and `unstageOrders` hooks are available and working correctly.
-   "Siap Kirim" orders are simply orders where `status: 'staged'`.

## Plan

### Step 1: Update TagSidebar & Filtering ("The Cart View")
-   **Files**: `src/app/page.tsx`, `src/components/lyncis/bucket/tag-sidebar.tsx`
-   **Change**:
    -   In `TagSidebar`, add a persistent static row at the top of the tag list for "Siap Kirim" with a distinct icon (e.g., Shopping Cart or Package). Show the staged orders count next to it.
    -   In `page.tsx`, adjust the active tag state to allow selecting this virtual tag (e.g., `setSpecialTab('staged')`).
    -   When this virtual tag is selected, filter the main `OrderTable` to display only `stagedOrders` instead of filtering by the normal metadata string tags.
-   **Verify**: `npx tsc --noEmit src/app/page.tsx`

### Step 2: Add Shopify-style Checkout Trigger (Header)
-   **Files**: `src/app/page.tsx`
-   **Change**:
    -   Add a persistent button in the top right header (next to "Tambah Pesanan").
    -   Label it "Siap Kirim (N)" where N is `stagedOrders.length`.
    -   Clicking this button directly triggers `setBatchWizardOpen(true)`.
    -   If N === 0, disable or hide the button.
-   **Verify**: `npx tsc --noEmit src/app/page.tsx`

### Step 3: Implement Sticky Bottom Selection Bar
-   **Files**: `src/components/lyncis/bucket/sticky-selection-bar.tsx` (new), `src/app/page.tsx`
-   **Change**:
    -   Create `StickySelectionBar` to replace `FloatingActionBar`. Use a dark glassmorphism styling fixed at the very bottom center spanning a reasonable width.
    -   Pass down exactly how many selected items are "unassigned" vs "staged".
    -   **Scenario 1 (Inbox Only)**: Show "Pindah ke Siap Kirim" (Add to Cart).
    -   **Scenario 2 (Staged Only)**: Show "Hapus dari Siap Kirim" (Remove from Cart).
    -   **Scenario 3 (Mixed)**: Show BOTH buttons so the user can choose to converge the state to all Staged or all Unassigned.
    -   In `page.tsx`, wire these actions to `stageOrders` and `unstageOrders`. Remove old FAB logic.
-   **Verify**: `npx tsc --noEmit`

### Step 4: Refactor Batch Wizard to Side Sheet
-   **Files**: `src/components/lyncis/fulfillment/batch-wizard.tsx`
-   **Change**:
    -   Change `<SheetContent side="bottom" ...>` to `<SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col h-full bg-background">`.
    -   Ensure standard `flex-col`, `flex-1 overflow-y-auto`, and pinned Footer structure so content scrolls without the buttons going off-screen.
-   **Verify**: `npx tsc --noEmit`

### Step 5: Expandable Review Cards & Inline Edit Sync
-   **Files**: `src/components/lyncis/fulfillment/completion-gate.tsx`, `src/components/lyncis/fulfillment/batch-summary.tsx`, `src/components/lyncis/fulfillment/batch-wizard.tsx`, `src/app/page.tsx`
-   **Change**:
    -   In Steps 1 and 4, modify the mapped order cards to be expandable (e.g., simple `useState` toggle) revealing full Details (Recipient phone, address, items list, total items).
    -   Wire the "Edit" button to trigger `OrderEditSheet` from `page.tsx` correctly (either by passing `onEditOrder` up to page.tsx, or managing an isolated edit sheet).
    -   In `batch-wizard.tsx`, add a `useEffect` that listens to `orders` (from `useStagedOrders`). If an order's data updates (due to edit), merge it into `logisticsState` *without* discarding existing user inputs like dimensions unless absolutely necessary.
-   **Verify**: `npx tsc --noEmit`

## Risks & mitigations
-   **Nested Sheet Z-Index**: Opening an `OrderEditSheet` while `BatchWizard` `Sheet` is already open might cause overlay trapping or z-index wars in Shadcn UI.
    -   *Mitigation*: Test immediately. If it fails, move the `OrderEditSheet` trigger strictly to `page.tsx` at a higher DOM level or use a `Dialog` as fallback.
-   **Data Sync Overwrite**: Re-evaluating logistics on *every* order change might blow away user-typed dimensions.
    -   *Mitigation*: The `useEffect` that initializes logistics must be careful to only initialize *missing* orders, or do a shallow merge that respects already-populated `logisticsState` fields.

## Rollback plan
-   If UX feels worse, `git checkout` to restore `floating-action-bar.tsx` and the bottom-sheet version of `batch-wizard.tsx`, then revert `page.tsx` selection logic.
