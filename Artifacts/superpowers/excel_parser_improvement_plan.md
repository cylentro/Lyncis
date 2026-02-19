# Plan: Improve Excel Item Parser

## Steps
1. **Update `convertRowsToOrders` in `src/lib/excel-to-orders.ts`**:
    - Change the item collection logic to support multiple items.
    - Integrate `splitContact` from `whatsapp-parser.ts` to improve contact extraction if mappings are sparse.
    - Ensure mapped columns always take precedence.
2. **Verification**:
    - Verify that an Excel row with multiple items in the "Item" cell correctly splits into multiple `JastipItem` objects.
    - Verify that a cell with "Name (0812...)" correctly extracts the phone number if the phone column is not mapped.

## Verification Steps
- I'll simulate a parsing call if possible, or provide a detailed walkthrough of the regex logic applied to Excel rows.
