## Goal
Add a **Triage & Refine** step to the Excel import flow — a post-import review UI that mirrors the WhatsApp extraction review cards. After the user uploads → maps headers → confirms import, the imported orders appear as review cards in the Order Table (or a dedicated triage panel) where the user can spot-check, edit, or dismiss each order before it is "finalized" into the main bucket.

The flow is:
**Upload → Mapping Header → Final Submission (import to DB) → Triage & Refine (Review Cards in Order Table)**

## Assumptions
- The WhatsApp parser UI (`whatsapp-paste.tsx`) is **not touched**.
- "Triage" happens **after** data is already saved to the DB (not before), so large batches don't overwhelm the user.
- Orders imported from Excel will be flagged with a new `metadata.needsTriage = true` field.
- The Order Table will show a "Triage Mode" banner/panel when there are orders pending triage.
- Each triage card mirrors the WhatsApp review card: name, phone, address, items, confidence badge, edit/dismiss buttons.
- Editing a triage card opens the existing `OrderEditSheet`.
- "Dismissing" (approving) a card marks `metadata.needsTriage = false` and `metadata.isVerified = true`.
- A "Approve All" button clears all triage flags at once.

## Plan

### Step 1 — Add `needsTriage` to types and DB actions
- **Files**: `src/lib/types.ts`, `src/app/actions.ts` (or wherever DB mutations live)
- **Change**:
  - Add `needsTriage?: boolean` to `JastipOrder.metadata`.
  - Add a server action `markOrdersTriaged(ids: string[])` that sets `metadata.needsTriage = false` and `metadata.isVerified = true` for the given IDs.
- **Verify**: TypeScript compiles with no errors (`npx tsc --noEmit`).

### Step 2 — Flag Excel-imported orders as `needsTriage = true`
- **Files**: `src/lib/excel-to-orders.ts`
- **Change**: In the returned order object, set `metadata.needsTriage = true` alongside `sourceFileName`.
- **Verify**: After an Excel import, check the DB/state and confirm `needsTriage: true` is present on each imported order.

### Step 3 — Create `ExcelTriagePanel` component
- **Files**: `src/components/lyncis/bucket/excel-triage-panel.tsx` (new file)
- **Change**: Build a new component that:
  - Accepts `orders: JastipOrder[]` (filtered to `needsTriage === true && metadata.sourceFileName !== undefined`).
  - Accepts `onEdit(order)`, `onApprove(id)`, `onApproveAll()` callbacks.
  - Renders a sticky banner at the top: "X pesanan dari Excel menunggu review" with an "Approve All" button.
  - Below the banner, renders review cards (similar to WhatsApp review cards) for each triage order:
    - Name, phone, address, location pill (or "Lokasi belum terpetakan" warning).
    - Items badges.
    - AI badge if `isAiParsed`.
    - Warning indicator if confidence is low (missing name/phone/address/items).
    - Edit button (opens `OrderEditSheet`).
    - Approve (✓) button to mark single order as verified.
- **Verify**: Component renders without errors in isolation (visual check in browser).

### Step 4 — Wire `ExcelTriagePanel` into the Order Table / main page
- **Files**: `src/app/page.tsx`, `src/components/lyncis/bucket/order-table.tsx`
- **Change**:
  - In `page.tsx`, derive `triageOrders` from the orders list: `orders.filter(o => o.metadata?.needsTriage)`.
  - Pass `triageOrders` to a new `<ExcelTriagePanel>` rendered **above** the `<OrderTable>` (or as a collapsible section inside it).
  - Wire `onEdit` → existing `handleEdit` (opens `OrderEditSheet`).
  - Wire `onApprove(id)` → calls `markOrdersTriaged([id])` then refreshes orders.
  - Wire `onApproveAll()` → calls `markOrdersTriaged(triageOrders.map(o => o.id))` then refreshes.
  - Hide the panel when `triageOrders.length === 0`.
- **Verify**: After Excel import, the triage panel appears above the table. After approving all, it disappears.

### Step 5 — Add `markOrdersTriaged` server action
- **Files**: `src/app/actions.ts` (or equivalent)
- **Change**: Implement the server action that updates `metadata.needsTriage` and `metadata.isVerified` in the DB for the given order IDs.
- **Verify**: Calling the action from the browser updates the DB and the UI refreshes correctly.

### Step 6 — Polish & edge cases
- **Files**: `src/components/lyncis/bucket/excel-triage-panel.tsx`, `src/app/page.tsx`
- **Change**:
  - Add a collapse/expand toggle to the triage panel (so it doesn't dominate the screen for large batches).
  - Show a count badge on the panel header: "12 pesanan menunggu triage".
  - Animate panel in/out with `framer-motion`.
  - Ensure the triage panel is scrollable if there are many cards.
- **Verify**: Visual check — panel collapses/expands, animation is smooth, count badge updates correctly.

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| DB schema change for `needsTriage` breaks existing orders | `needsTriage` is optional (`?`), so existing orders without it are unaffected |
| Large batches (500+ rows) make the triage panel overwhelming | Panel is collapsible by default for batches > 20 orders; "Approve All" is always visible |
| User accidentally approves bad data | Edit button is always accessible; approval is reversible by re-importing |
| `markOrdersTriaged` server action is slow for large batches | Batch update in a single DB call, not per-order |

## Rollback Plan
- If the triage panel causes regressions, remove the `<ExcelTriagePanel>` render from `page.tsx` — the rest of the app is unaffected.
- The `needsTriage` flag is additive and optional, so no DB migration is needed to roll back.
