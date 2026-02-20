# Insurance Implementation Plan

Implement insurance opt-in for orders, requiring item category and price, with automatic fee calculation (0.2%).

## Proposed Changes

### Core Data Model
#### [MODIFY] [types.ts](file:///Users/christianhadianto/Documents/TechSmith/Lyncis/src/lib/types.ts)
- Add `InsuranceInfo` interface.
- Add `insurance?: InsuranceInfo` to `JastipOrder`.

### Localization
#### [MODIFY] [en.ts](file:///Users/christianhadianto/Documents/TechSmith/Lyncis/src/i18n/dictionaries/en.ts)
- Add translations for `insurance`, `item_category`, `item_price`, `insurance_fee`, etc.
#### [MODIFY] [id.ts](file:///Users/christianhadianto/Documents/TechSmith/Lyncis/src/i18n/dictionaries/id.ts)
- Add translations for `asuransi`, `kategori_barang`, `harga_barang`, `biaya_asuransi`, etc.

### Constants & Utilities
#### [NEW] [categories.ts](file:///Users/christianhadianto/Documents/TechSmith/Lyncis/src/lib/constants/categories.ts)
- Hardcode the 15 categories from `item category.csv` for fast access in the UI.

### UI Components
#### [MODIFY] [order-form-content.tsx](file:///Users/christianhadianto/Documents/TechSmith/Lyncis/src/components/lyncis/bucket/order-form-content.tsx)
- Integrate the Insurance section (Toggle + Fields).
- Implement real-time calculation of 0.2% fee.
- Ensure validation logic accounts for mandatory fields when insurance is enabled.

### Verification Plan

### Automated Tests
- Run `npm test src/lib/__tests__/item-parser.test.ts` to ensure no regressions.
- Add a new test `src/lib/__tests__/insurance.test.ts` to verify the 0.2% calculation logic.

### Manual Verification
1. Open the "Add Order" or "Edit Order" dialog.
2. Toggle "Add Insurance" to ON.
3. Verify that Category and Price fields appear.
4. Select a category and enter a price (e.g., 10,000,000).
5. Verify that "Insurance Fee" automatically shows 20,000 (0.2%).
6. Toggle "Add Insurance" to OFF.
7. Verify fields disappear.
8. Save the order and re-open to verify the insurance state is persisted.
