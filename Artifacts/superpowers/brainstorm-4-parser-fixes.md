# Brainstorm: Fixing Parser Leakage & Complex Names

## Goal
Improve parsing accuracy for the 21 scenarios provided by the user, specifically focusing on fixing address leakage (items being part of address) and improving recognition of complex item lines (e.g., those with digits in names).

## Constraints
- Must NOT break existing patterns (52 tests must pass).
- Must stay within regex-based approach for performance/predictability (LLM is fallback).
- Shared library `item-parser.ts` must handle the core logic.

## Risks
- Making regex too greedy for item names might cause contact info (phone/address) to be misidentified as items.
- Aggressive removal of item lines might remove parts of addresses that happen to match item patterns (e.g., 'Block A 1').

## Options
1. **Sync Item Removal**: Ensure `whatsapp-parser.ts` uses the EXACT same patterns as `item-parser.ts` to clean text before contact splitting.
2. **Improve Name Regex**: Allow numbers in names (like 'Aqua 600ml') while being strict about the qty/price suffix.
3. **Contact Splitter Boundary**: Improve the contact splitter to stop at known item markers (like 'Pesanan:', 'Item:', or bullets) if they appear at the end of a block.
4. **Refine Potential Item Count**: Adjust `countPotentialItems` to avoid counting contact labels or lines already matched.
5. **Adjust AI Fallback Threshold**: Ensure the UI (`whatsapp-paste.tsx`) and backend (`excel-to-orders.ts`) use the AI fallback automatically when regex confidence is below the user-defined threshold (default 0.85).

## Recommendation
- Implement **Option 1 & 2** as immediate fixes for leakage and missing items.
- Implement **Option 4** to fix the '3 items detected but only 2 parsed' discrepancy.
- Implement **Option 5** to satisfy the requirement for automatic AI fallback when confidence is insufficient.

## Acceptance Criteria
- Scenario 5, 9, 11, 19: Items no longer appear in `addressRaw`.
- Scenario 11: 'Aqua 600ml 6 18000' is correctly parsed by regex.
- Scenario 3: 'alamat taman duren sawit' is NOT parsed as an item.
- Scenario 1 & 2: `potentialItemCount` matches actual parsed items.
- AI Fallback: Correctly triggers in `whatsapp-paste.tsx` when confidence < threshold (0.85).
- Existing 52 unit tests pass.
