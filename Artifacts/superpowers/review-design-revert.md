# Review: Revert Item Order Design

## Checklist
- [x] Design matches Image 2 (vertical layout).
- [x] Consistent labeling across components.
- [x] No unrelated code modified.
- [x] Type check passes.

## Issues by Severity

### Blocker
- None.

### Major
- None.

### Minor
- None.

### Nit
- **Labeling**: In `LogisticsInput` (Insurance), the "Description" field is technically selecting a category. While consistent with the "Image 2" layout, some users might prefer the label "Kategori Barang" over "Deskripsi Barang" for insurance. Currently using standard "Deskripsi Barang" for maximum visual consistency.
- **Read-only fields**: The "Qty" for insurance items is hardcoded to 1 and displayed as a read-only box. This is correct for the logic but differs slightly from the editable Qty in regular orders.
