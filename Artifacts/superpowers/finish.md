# Finish Summary — Excel Triage Panel

## What Was Built
A persistent, non-blocking **Triage & Refine** panel for Excel-imported orders.

**Flow**: Upload → Map Headers → Import to DB → **Triage panel appears in Order Table**

Users can review, edit, or approve orders at any time — even right before processing.

## Files Changed
| File | Change |
|---|---|
| `src/lib/types.ts` | Added `needsTriage?: boolean` to `JastipOrder.metadata` |
| `src/lib/excel-to-orders.ts` | Set `metadata.needsTriage: true` on all Excel-converted orders |
| `src/hooks/use-lyncis-db.ts` | Added `markOrdersTriaged(ids)` batch DB mutation |
| `src/components/lyncis/bucket/excel-triage-panel.tsx` | **New** — full triage panel component |
| `src/app/page.tsx` | Wired triage panel above OrderTable |

## Verification
- `npx tsc --noEmit` — PASS (only pre-existing test file errors, unrelated to this work)

## Manual Validation Steps
1. Import an Excel file → confirm triage panel appears above the Order Table
2. Check that cards show warning indicators for orders with missing phone/address/location
3. Click "Edit" on a card → confirm `OrderEditSheet` opens
4. Click "✓" (Approve) on a single card → card disappears from panel
5. Click "Setujui Semua" → all cards disappear, panel hides
6. Refresh page → confirmed approved orders no longer show in triage panel (persisted in Dexie)

## Review
- Blocker: None
- Major: None
- Minor: `getParsingConfidence` imported from whatsapp-parser (utility only, no UI touched)
- Nit: Unused `activeTab` state in excel-upload.tsx (pre-existing, out of scope)

## Follow-ups
- Consider adding a "source file" label on each triage card (e.g., "from: orders-may.xlsx")
- Future: filter triage panel by tag so users can focus on one batch at a time
