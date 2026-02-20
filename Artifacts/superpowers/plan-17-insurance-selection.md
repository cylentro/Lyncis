# Goal
Implement item-level insurance selection in the Fulfillment Wizard, utilizing a dynamic item list and a manual "Fill with AI" assist, enforcing the "all or nothing" policy and per-item category assignment without disrupting the fast intake flow.

# Assumptions
- Users must select an item category from `Artifacts/Products/item category.csv`.
- The insurance fee is exactly `0.2% * total insured value`.
- There is no partial insurance—the toggle applies to the entire order.
- The AI parsing for insurance must be manually triggered only inside the Fulfillment Wizard using a server action.
- `src/lib/types.ts` defines `JastipOrder`.

# Constraint
DO NOT MODIFY ANY FUNCTION AND UI THAT ALREADY EXISTS IF NOT RELATED TO THIS FEATURE. YOU ONLY ALLOWED TO ADD NEW FUNCTION AND UI AND MODIFY THE FUNCTION AND UI THAT RELATED TO THIS FEATURE.

# Plan

1. **Update `JastipOrder` and Logistics Types**
   - **Files**:
     - `src/lib/types.ts`
     - `src/components/lyncis/fulfillment/logistics-input.tsx`
   - **Change**:
     - In `JastipOrder`, add an optional `insurance` property containing `isInsured`, `items: { categoryId: string; price: number }[]`, and `totalFee`.
     - In `logistics-input.tsx`, update `OrderLogisticsForm` to track `isInsured`, `insuredItems: { id: string, categoryCode: string, price: number }[]`, and `insuranceFee: number`.
   - **Verify**: Run `npx tsc --noEmit` to ensure type-checking passes.

2. **Implement LLM Insurance Extractor**
   - **Files**:
     - `src/lib/llm-parser.ts`
   - **Change**:
     - Add `extractInsuranceItems(text: string, categories: {code: string, label: string}[])` function.
     - Provide a small, strict prompt to parse items from the original raw text, guess their best category match from the provided category schema, and extract their total pricing for each unique item.
     - Return an array of `{ categoryCode: string, price: number }`.
   - **Verify**: Validate the script syntax and verify no export/import blocks break.

3. **Build the Dynamic "Insured Items" UI in Logistics Input**
   - **Files**:
     - `src/components/lyncis/fulfillment/logistics-input.tsx`
     - Need to read/import the 15 categories manually or via a constant. Wait, we can convert the CSV to a constant in `src/lib/constants/item-categories.ts` for clean Next.js client usage.
   - **Change**:
     - Create `src/lib/constants/item-categories.ts` copying the 15 categories from the CSV.
     - In `logistics-input.tsx`, add an "Add Insurance" Switch.
     - When `isInsured` is true, render a dynamic list with `Category` dropdown and `Price` input, including "+ Add another insured item" and "Remove" (if >1 item).
     - Add a "Fill with AI" button (with a sparkle icon overlay). When clicked, execute `extractInsuranceItems` server action using `order.metadata?.originalRawText`.
     - Update the internal calculation loop to compute `insuranceFee (price * 0.002)` dynamically and store it.
   - **Verify**: The UI must render correctly when toggled, calculate fees in real-time smoothly, and call AI without breaking the React tree.

4. **Show Insurance in Batch Summary and Process Backend**
   - **Files**:
     - `src/components/lyncis/fulfillment/batch-summary.tsx`
     - `src/components/lyncis/fulfillment/batch-wizard.tsx`
   - **Change**:
     - In `batch-wizard.tsx`'s `handleCommit`, map the `logisticsState` insurance properties cleanly into the final `JastipOrder.insurance` object.
     - In `batch-summary.tsx`, display the Insurance row in the cost breakdown if `insuranceFee > 0`. Mention the total insured items summary.
   - **Verify**: Commit a test batch covering full insurance to verify the object logs perfectly, and summary shows correct sum `estimatedCost + insuranceFee`.

# Risks & mitigations
- **AI Extraction Error**: Users might click "Fill with AI" and it fails or returns bad formatting.
  - *Mitigation*: Wrap the AI call in a try-catch, and allow the user to gracefully fall back to manual entry.
- **Client/Server Mismatch**: Parsing CSV in a client component is bad.
  - *Mitigation*: We convert the static CSV list into a simple TS array in a `constants` file so it is fast and reliable on both client and server.

# Rollback plan
- Revert changes to `src/lib/types.ts`.
- Revert `src/components/lyncis/fulfillment/logistics-input.tsx` and `batch-wizard.tsx`.
- Delete `src/lib/constants/item-categories.ts`.
