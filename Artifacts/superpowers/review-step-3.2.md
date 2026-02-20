# Review: Step 3.2 - Logistics Engine

## Changes
1.  **Created Logistics Utility (`src/lib/logistics.ts`)**:
    -   `calculateVolumetricWeight`: Formula `(L*W*H)/6000`
    -   `calculateChargeableWeight`: Max of actual vs volumetric
2.  **Created Shipping Zones Logic (`src/lib/shipping-zones.ts`)**:
    -   `ShippingZone` type and `PROVINCE_TO_ZONE` map covering all 34+ provinces.
    -   Fuzzy matching logic in `getZoneForProvince`.
    -   `getShippingRate` and `calculateShippingCost`.
    -   Sample pricing data included.
3.  **Added Unit Tests**:
    -   `src/lib/__tests__/logistics.test.ts`: Covers weight calculations and edge cases.
    -   `src/lib/__tests__/shipping-zones.test.ts`: Covers zone lookup, fuzzy matching, and pricing logic.

## Verification
-   Ran `npx vitest run src/lib/__tests__/logistics.test.ts src/lib/__tests__/shipping-zones.test.ts`
-   All 15 tests passed.

## Next Steps
-   Proceed to Step 3.3: Build Batch Wizard Components (Completion Gate, Logistics Input, etc.).
