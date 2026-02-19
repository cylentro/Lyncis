## Goal
1. Fix two confirmed parser bugs (qty+name no price, qty×name trailing price without @)
2. Extract shared parsing logic into `src/lib/item-parser.ts`
3. Write complete unit tests (all 10 existing patterns + bug fixes + edge cases)
4. Add `parseWarning` metadata flag to orders with unresolved items
5. UI: add "⚠ Perlu Review" filter tab to the EXISTING OrderTable (no separate panel)
6. Remove ExcelTriagePanel (replaced by the filter approach)

## Confirmed Bugs (from test data)

### Bug 1 — "2 ayam goreng" (qty + name, no price) → item silently dropped
- None of the 10 patterns match qty+name without price
- Fix: detect these lines, include item with price=0, set parseWarning=true

### Bug 2 — "3x coca cola 21.000" → name="coca cola 21.000", price=0
- Pattern 1 price group requires `@` prefix; "21.000" gets absorbed into name
- Fix: extend Pattern 1 to also capture trailing price WITHOUT `@`

## Architecture — Shared Parser Library
Extract from whatsapp-parser.ts into src/lib/item-parser.ts:
- parsePrice(), extractItems(), getParsingConfidence(), countPotentialItems()
Re-export from whatsapp-parser.ts (transparent, zero behavior change).
excel-to-orders.ts imports from item-parser.ts directly.

## Plan

### Step 1 — Create src/lib/item-parser.ts
- Copy the 4 functions verbatim from whatsapp-parser.ts
- Fix Bug 2: Pattern 1 extended to capture trailing price without @
  Old: `(\d+)\s*x\s*([^@\n]+?)(?:\s*@\s*...price...)?`
  New: `(\d+)\s*x\s*([^@\n\d]+?)(?:\s*(?:@\s*)?(?:Rp\.?\s*)?([0-9.,]+(?:k)?))?`
  (name group stops at digits so trailing price is captured separately)
- Add parseWarning detection: after all patterns, scan unmatched lines for
  `^\s*(\d+)\s+([A-Za-z][^\d\n@]{2,})\s*$` → item with price=0
- Return type: `{ items: JastipItem[], hasUnpricedItems: boolean }`
- Export all 4 functions + new type
- Verify: unit tests (Step 3)

### Step 2 — Update whatsapp-parser.ts to re-export from item-parser.ts
- Remove local implementations of the 4 functions
- Add: `export { parsePrice, extractItems, getParsingConfidence, countPotentialItems } from './item-parser'`
- All other logic (splitContact, parseWhatsAppText, etc.) stays UNCHANGED
- Verify: `npx tsc --noEmit` passes

### Step 3 — Write unit tests src/lib/__tests__/item-parser.test.ts
Scenarios to cover (matching data-for-test.txt):
- S1: "2x Pocky @30000\n3 Chitato 45000" → 2 items correct
- S2: "3x coca cola 21.000" → qty:3, name:"coca cola", price:21000 (Bug 2)
- S3: "2 ayam goreng\n3x coca cola" → 2 items, price=0, hasUnpricedItems:true (Bug 1)
- S4: "2 ayam goreng @10k\n3x coca cola 21.000" → 2 items, prices correct
- S5: k-suffix: "3.5k"→3500, "10k"→10000, "2.5k"→2500
- S6: dot separator: "21.000"→21000, "9.000"→9000
- S7: comma separator: "30,000"→30000
- S8: Rp prefix: "Rp 25.000"→25000, "Rp12000"→12000
- S9: numbered list "1. Chitato @12000 (2pcs)" → qty:2, price:12000
- S10: bullet list "- Indomie 3500" → qty:1, price:3500
- S11: item@price qty "Pocky @30000 2x" → qty:2, price:30000
- S12: item qty price "Indomie Goreng 3 9000" → qty:3, price:9000
- S13: getParsingConfidence: full order → 1.0, missing phone → <0.8
- S14: countPotentialItems: counts item-like lines correctly
- Verify: `npx vitest run` all pass

### Step 4 — Update excel-to-orders.ts
- Import from ./item-parser instead of ./whatsapp-parser
- Use new extractItems return type { items, hasUnpricedItems }
- Compute parseWarning: hasUnpricedItems || !locationData.kota
- Add parseWarning to metadata
- Verify: Row 1 → parseWarning:true; Row 2 → parseWarning:false

### Step 5 — Add parseWarning to types.ts
- Add `parseWarning?: boolean` to JastipOrder.metadata
- Verify: `npx tsc --noEmit` passes

### Step 6 — Add "Perlu Review" filter tab to OrderTable
- File: src/components/lyncis/bucket/order-table.tsx
- Change:
  - Add 'needs-review' to filter type union
  - Add filter tab "⚠ Perlu Review" with amber styling + count badge
  - Filter logic: needsTriage===true OR parseWarning===true
  - Warning rows: amber left border (border-l-2 border-amber-400) + amber row bg tint
  - Add "Setujui" (✓) action button in Actions column for needsTriage rows
    (calls onApprove prop, same as existing onConfirm pattern)
  - Add onApprove prop to OrderTableProps
- File: src/app/page.tsx
  - Pass onApprove={handleApproveOne} to OrderTable
  - Remove ExcelTriagePanel render + import
- File: src/components/lyncis/bucket/excel-triage-panel.tsx
  - DELETE (replaced by filter tab approach)
- Verify: After Excel import, "Perlu Review" tab shows count badge, rows are amber-tinted

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Re-export breaks whatsapp-parser consumers | All public exports preserved; re-export is transparent |
| Bug 2 fix changes name parsing for valid names with numbers | Name group stops at digits only when followed by price pattern; tested in unit tests |
| Deleting ExcelTriagePanel breaks page.tsx | Remove import + render in same step |
| 'needs-review' filter shows 0 for non-Excel orders | Filter only applies to orders with needsTriage/parseWarning flags |

## Rollback
- item-parser.ts is additive; whatsapp-parser.ts re-exports are transparent
- OrderTable filter is additive (new tab, existing tabs unchanged)
