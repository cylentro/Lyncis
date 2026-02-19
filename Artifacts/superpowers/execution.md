# Execution Log — Excel Triage Panel

## Step 1 — Add `needsTriage` to types
- **File**: `src/lib/types.ts`
- Added `needsTriage?: boolean` to `JastipOrder.metadata`
- **Verify**: `npx tsc --noEmit` — PASS (no new errors)

## Step 2 — Flag Excel-imported orders as `needsTriage = true`
- **File**: `src/lib/excel-to-orders.ts`
- Set `metadata.needsTriage: true` in the returned order object
- **Verify**: Visual — any Excel import will now carry the flag in Dexie

## Step 3 — Add `markOrdersTriaged` DB mutation
- **File**: `src/hooks/use-lyncis-db.ts`
- Added `markOrdersTriaged(ids: string[])` — batch transaction that sets `needsTriage: false` and `isVerified: true`
- **Verify**: `npx tsc --noEmit` — PASS

## Step 4 — Create `ExcelTriagePanel` component
- **File**: `src/components/lyncis/bucket/excel-triage-panel.tsx` (new)
- Collapsible panel with review cards mirroring WhatsApp extraction UI
- Per-card: name, phone, address, location pill, items badges, AI badge, warning indicator, Edit + Approve buttons
- "Approve All" button in banner header
- Auto-collapses for batches > 20 orders
- Animated with framer-motion
- **Verify**: `npx tsc --noEmit` — PASS

## Step 5 — Wire into `page.tsx`
- **File**: `src/app/page.tsx`
- Imported `ExcelTriagePanel` and `markOrdersTriaged`
- Derived `triageOrders` from orders list
- Added `handleApproveOne` and `handleApproveAll` handlers
- Rendered `<ExcelTriagePanel>` above `<OrderTable>` when `triageOrders.length > 0`
- **Verify**: `npx tsc --noEmit` — PASS (only pre-existing test file errors)

---
### Drawer Title Standardization
- **Files changed**: `src/components/lyncis/bucket/order-edit-sheet.tsx`, `src/components/lyncis/bucket/order-table.tsx`
- Removed forced "Review Pesanan" title in `OrderEditSheet`. Now consistently shows "Edit Pesanan" or "Detail Pesanan" even for orders needing triage.
- Shortened triage button tooltip in `OrderTable` to "Review".
- Reason: User requested titles represent purpose; warning icons and badges already identify orders needing review.
