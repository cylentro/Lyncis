# Brainstorm: Improving Excel Item Parser

## Goal
Improve the Excel item parser to match the quality of the WhatsApp parser, specifically handling multiple items per row and smarter contact data extraction, without modifying the existing WhatsApp parser.

## Constraints
- DO NOT TOUCH `src/lib/whatsapp-parser.ts`.
- Must respect user mappings (if columns are mapped, they take priority).
- Handle multiple items if listed in a single Excel cell.
- Improve recipient data extraction (Name/Phone/Address) using existing `whatsapp-parser` logic.

## Risks
- Overwriting explicitly mapped data with "smart" guesses.
- Multiple items in Excel might conflict with standard "one row = one order" assumptions if not handled carefully.

## Options
1. **Multi-Item parsing**: Change `excel-to-orders.ts` to use the full array returned by `extractItems`.
2. **Smart Reach**: If contact info is incomplete in mapped columns, try parsing the "Address" or "Name" cell for hidden phone numbers or addresses using `splitContact`.
3. **Price/Qty fallback**: Better logic for when to trust the mapped column vs the parsed result.

## Recommendation
Implement both Multi-Item parsing and Smart Reach for contact info.

## Acceptance Criteria
- Multiple items in one Excel cell are correctly parsed and added to the order.
- Contact info can be extracted from a single cell if other mapped columns are empty.
- Mapped columns still take priority.
