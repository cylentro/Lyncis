# Plan: Consolidate Order Details to Side Sheet

## Steps

### 1. Enhance `OrderEditSheet.tsx`
- **Fields Update**:
    - Add `kelurahan` to Recipient grid.
    - Add "Logistik & Packing" section below Items.
    - Fields: `originId` (as Select), `finalPackedWeight`, `dimensions.l`, `dimensions.w`, `dimensions.h`.
    - Read-only fields: `volumetricWeight`, `chargeableWeight`.
- **Logic Update**:
    - Implement `updateLogistics` function.
    - Add a calculation Effect for `volumetricWeight` and `chargeableWeight`.
- **Import Update**:
    - Import `Select`, `SelectTrigger`, etc., for Origin selection.

### 2. Update `app/page.tsx`
- **Cleanup**:
    - Remove `OrderDetailDrawer` import and usage.
    - Remove `viewingOrder` and `detailDrawerOpen` state + handlers.
- **Wiring**:
    - Update `handleViewDetails` to simply call `handleEdit(order)`. This ensures both "Detail" and "Edit" use the Side Sheet.

### 3. Finalize
- **File Removal**: Delete `src/components/lyncis/bucket/order-detail-drawer.tsx`.
- **Verification**:
    - Open the Order Table.
    - Click the "Detail" icon (External Link).
    - Ensure Side Sheet opens with all fields present (Recipient, Items, Logistics).
    - Verify weight calculations (change L/W/H and see Volumetric Weight update).

## Verification Commands
- `npm run dev` (Manual verification in browser)
- Check build errors: `npx tsc --noEmit`
