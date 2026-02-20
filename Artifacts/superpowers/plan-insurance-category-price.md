# Plan: Refining Insurance Flow & Removing Shadows

## Goals
1. Remove all shadows (`shadow-sm`, `shadow-md`, `shadow-[...]`) from the insurance UI and general logistics cards to flatten the design.
2. Fix the insurance flow: Instead of allowing users to manually construct a list of "insured items", the UX should iterate over the existing `order.items` (from order creation). 
3. For each existing item, allow the user to select an `item category` for insurance purposes, reusing the pre-inputted `totalPrice` as the insured value.

## Constraints & Risks
- When an order item is modified (earlier in the flow or via "Edit Order"), the insurance list should react accordingly or fail gracefully if an item is removed.
- The insurance fee calculation must use the sum of all item prices, or the user can choose which items to insure. Given the prompt: "each item should be assigned to item category", we assume all items are insured if the checkbox is checked.

## Step-by-Step Implementation

1. **Update `src/lib/types.ts`:**
   - Update `JastipOrder['insurance']['items']` to optionally strongly link to `order.items` by adding `itemId?: string; name?: string;`. This ensures we retain the context.
   
2. **Update `src/components/lyncis/fulfillment/logistics-input.tsx`:**
   - **Form State Initialization**: When `isInsured` is checked, automatically construct `form.insuredItems` by mapping over `order.items` directly (so no `uuidv4()` for new blank items). Pre-fill `price` with `item.totalPrice` and `itemId` with `item.id`.
   - **Remove Shadow Classes**: Scour the component for `shadow-xs`, `shadow-sm`, `shadow-md` and remove them from the card/container styles.
   - **UI Changes**: 
     - Remove the "Add Item" button under the insurance section.
     - Remove the "Delete Item" button (unless user can selectively insure individual items, but the prompt implies assigning a category to *every* item).
     - Display a vertical stack (or horizontal grid) for each item:
       - Show the original `item.name` (read-only) and `item.qty`.
       - Show a Category Select dropdown for assigning the insurance category.
       - Show the locked `totalPrice` for the item.
     - Automatically sum the insurance fee based on `item.totalPrice` * 0.2%. (Wait, is the price editable here? The user said "item price already been inputed", so it should be purely read-only).

3. **Update `src/components/lyncis/fulfillment/batch-wizard.tsx`:**
   - Ensure that `insuredItems` mapping uses the order's actual items if it falls back to default.

4. **Verify Calculations**:
   - Double-check that `totalCost` and `insuranceFee` compute correctly without manual price input.

Please run `/superpowers-execute-plan` if this plan aligns with your expectations!
