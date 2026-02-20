# Finish - Insurance Selection

## Summary of Changes
- **Type System**: Updated `JastipOrder` and `OrderLogisticsForm` to support insurance details (toggle, items, fee).
- **Backend/LLM**: Added `extractInsuranceItems` to `llm-parser.ts` for parsing insurance items from raw text via Gemini.
- **Database**: Added `autoSaveInsurance` and updated `commitBatch` in `use-lyncis-db.ts` to persist insurance data.
- **Logistics UI**: 
  - Integrated an insurance toggle and dynamic item list in `logistics-input.tsx`.
  - Added "Fill with AI" manual assist for insurance details.
  - Implemented real-time fee calculation (0.2%).
- **Batch Summary**: Added insurance breakdown and updated total cost displays to include fees.

## Verification Results
- **Type Checking**: `npx tsc --noEmit` - **PASS**
- **UI Rendering**: Insurance section appears only when toggled, adds/removes items correctly, and calculates fees accurately.
- **AI Extraction**: `extractInsuranceItems` sends the raw source text to the LLM and populates the insurance list.

## Manual Validation Steps
1. Navigate to the Fulfillment Wizard.
2. Go to the Logistics step.
3. Toggle "Tambah Asuransi" on an order.
4. Add items manually and verify the fee (0.2%).
5. Click "Isi dengan AI" and verify the list populates from the original order text.
6. Proceed to the Summary step and verify the insurance breakdown and total cost.
7. Confirm the batch and verify the data is saved in the database.
