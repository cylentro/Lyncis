## Goal
1. Fix the Excel item parser to handle "Qty Item (no price)" format (e.g. "2 ayam goreng")
2. Redesign ExcelTriagePanel from card grid → compact table/list style
3. Add per-row "needs review" UI feedback when parsing confidence is low

## Root Cause (Parser)
`extractItems` from whatsapp-parser.ts has no pattern for "Qty Item" without a price.
Row 1 "2 ayam goreng\n3x coca cola": only "3x coca cola" is matched (Pattern 1).
"2 ayam goreng" is silently dropped because no pattern covers qty+name without price.

## Constraint
- DO NOT touch `whatsapp-parser.ts`
- Fix goes in `excel-to-orders.ts` as a post-processing supplemental step

## Plan

### Step 1 — Add supplemental "Qty Item (no price)" extraction in excel-to-orders.ts
- **File**: `src/lib/excel-to-orders.ts`
- **Change**: After calling `extractItems(itemNameRaw)`, run a supplemental pass over the
  raw text lines. For each line that was NOT already matched by extractItems, check if it
  matches `^\s*(\d+)\s+([A-Za-z].+?)\s*$` (qty + name, no price). If so, add it as an
  item with qty from the match, name from the match, price=0.
- **Verify**: "2 ayam goreng\n3x coca cola" → 2 items: {qty:2, name:"ayam goreng"} + {qty:3, name:"coca cola"}

### Step 2 — Redesign ExcelTriagePanel to table/list style
- **File**: `src/components/lyncis/bucket/excel-triage-panel.tsx`
- **Change**: Replace the card grid with a compact table:
  - Sticky header row: #, Name, Phone, Address/Location, Items, Status, Actions
  - Each order = one table row (dense, scannable)
  - "Needs review" rows highlighted with a subtle amber/red left border or row bg
  - Actions column: Edit icon + Approve checkmark (always visible, not hover-only)
  - Keep the banner header (count + Approve All) above the table
  - Keep collapse/expand toggle
  - Table is scrollable (max-height with overflow-y-auto)
- **Verify**: Visual check — table renders, rows are compact, warning rows are highlighted

### Step 3 — Add "needs review" indicator metadata to each order
- **File**: `src/lib/excel-to-orders.ts`
- **Change**: After building the order, compute a simple confidence flag:
  - `parseWarning: boolean` = true if items have price=0, or location is empty, or name is default
  - Store in `metadata.parseWarning`
- **File**: `src/lib/types.ts`
- **Change**: Add `parseWarning?: boolean` to `JastipOrder.metadata`
- **Verify**: Row 1 (no price items) gets `parseWarning: true`; Row 2 (has prices) gets `parseWarning: false`

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Supplemental pattern matches phone numbers as items | Guard: skip lines matching phone regex before applying pattern |
| Table layout breaks on mobile | Use horizontal scroll on the table container |
| parseWarning false positives | Only flag if price=0 AND no mapped price column exists |

## Rollback
- Parser change is additive (only adds items, doesn't remove existing ones)
- UI change is self-contained in excel-triage-panel.tsx
