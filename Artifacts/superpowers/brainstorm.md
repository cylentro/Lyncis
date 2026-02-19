# Brainstorming: Order Detail Consolidation

## Goal
Replace the bottom drawer for order details with the existing side sheet (used for editing) to ensure a unified and "complete" information display.

## Constraints
- Section-based layout to organize a large amount of data.
- Maintain premium aesthetics (vibrant colors, glassmorphism, smooth transitions).
- All fields from `JastipOrder` must be accounted for (Recipient details, Items, Logistics, Metadata).

## Risks
- **Data Overload**: Showing too many inputs might be overwhelming. Use clear visual hierarchy and separators.
- **State Management**: Ensure `formData` in `OrderEditSheet` properly synchronizes with all nested fields (Logistics).

## Information to Add (The "Complete" list)
- **Recipient**: Add `kelurahan`.
- **Logistics**: 
  - Origin (Select)
  - Packing Weight (KG)
  - Dimensions (L x W x H)
  - Automatically calculated: Volumetric Weight, Chargeable Weight.
- **Metadata**: Display `sourceFileName` and sequence info.

## Recommendation
Enhance `OrderEditSheet` to be the "Master Detail" view/edit component. Organise it into:
1. Tag/Event (Header)
2. Recipient Information
3. Item Breakdown
4. Logistics & Weights (New)

## Acceptance Criteria
- Eye icon (View Details) and Pencil icon (Edit) both open the Side Sheet.
- Side Sheet displays all missing fields (Kelurahan, Logistics).
- `OrderDetailDrawer` component is removed/deleted.
- Calculations for Volumetric and Chargeable weights are implemented for convenience.
