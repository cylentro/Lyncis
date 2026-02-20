
# Review: Step 3.3 - Batch Wizard Components

## Purpose
Build the UI components for the Fulfillment Batch Wizard, allowing users to validate orders, select origin, input logistics, and commit batches.

## Changes
1.  **Completion Gate (`completion-gate.tsx`)**:
    -   Validates recipient name, phone, address, and items.
    -   Blocks progress until all orders are complete.
    -   Allows removing orders from the batch.
2.  **Logistics Input (`logistics-input.tsx`)**:
    -   Form for weight, dimensions (`l, w, h`), and service type.
    -   Live calculation of volumetric weight and estimated shipping cost based on zone.
    -   Selectable service types (Regular, Next Day, etc.).
3.  **Origin Selector (`origin-selector.tsx`)**:
    -   Lists saved sender addresses.
    -   Inline "Add New" form using `LocationAutocomplete` and address fields.
    -   Saves new addresses to `senderAddresses` table via `use-lyncis-db`.
4.  **Batch Summary (`batch-summary.tsx`)**:
    -   Read-only overview of orders, weights, and costs.
    -   "Buat Pengiriman" button triggers `commitBatch`.
5.  **Batch Wizard Container (`batch-wizard.tsx`)**:
    -   Orchestrates the 4-step flow using a `Sheet`.
    -   Manages local state for logistics data before commit.
    -   Connects to `useStagedOrders` and `useSenderAddresses`.
6.  **Floating Action Bar (`floating-action-bar.tsx`)**:
    -   Context-aware FAB for "Proses Batch", "Tambah ke Batch", "Buka Batch".
    -   Uses framer-motion for smooth entry/exit.
7.  **Utilities**:
    -   `order-validator.ts`: Central logic for order completeness.
    -   `progress.tsx`: Custom UI component for step progress.

## Verification
-   **Type Safety**: `npx tsc --noEmit` passed successfully.
-   **Unit Tests**: Core logic (logistics calculation) covered in previous step. UI components rely on these tested utilities.

## Next Steps
-   **Step 3.4: Wire into Main Page**:
    -   Add `BatchWizard` and `FloatingActionBar` to `page.tsx`.
    -   Connect `useSelection` hook to FAB.
    -   Handle "Proses Batch" and "Buka Batch" events.
