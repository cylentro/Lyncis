# Plan — Phase 3: Fulfillment & Batching Logic

## Goal

Implement the complete fulfillment workflow: select orders → stage them → validate completion → input per-order logistics (weight, dims, service type, zone-based pricing) → select saved sender address → review summary → commit shipment. Single staging area with 3-state status lifecycle (`unassigned → staged → processed`).

## Assumptions

1. The existing `location.json` (84,913 records, 34 provinces) serves as the zone mapping source.
2. Zone-based pricing uses province groups (~7 zones), not individual provinces.
3. Only one active batch at a time. Orders can be added/removed incrementally.
4. The `SenderAddress` table is a new Dexie table stored alongside `orders`.
5. The batch wizard is a full-height Sheet (right side), consistent with the edit/review pattern.
6. All existing tests (`npm test`) and build (`npm run build`) must still pass after each step.

---

## Plan

### Step 1: Expand Type Definitions

- **Files:** `src/lib/types.ts`
- **Change:**
  - Add `ServiceType` type: `'regular' | 'nextday' | 'sameday' | 'instant'`
  - Add `SenderAddress` interface with fields: `id`, `label`, `name`, `phone`, `addressRaw`, `provinsi`, `kota`, `kecamatan`, `kelurahan`, `kodepos`, `isDefault`
  - Add `serviceType: ServiceType` and `estimatedCost: number` to the `JastipOrder.logistics` object
  - Add `batchId?: string` to `JastipOrder` for future multi-batch support
  - Update `OrderStatus` type to keep `'unassigned' | 'staged' | 'processed'` (already defined, verify `staged` exists)
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/types.ts
  ```

---

### Step 2: Update Database Schema (Dexie v2)

- **Files:** `src/lib/db.ts`
- **Change:**
  - Add `senderAddresses!: Table<SenderAddress>` to `LyncisDatabase`
  - Add version 2 migration:
    ```ts
    this.version(2).stores({
      orders: '++id, tag, status, createdAt, batchId',
      senderAddresses: '++id, label, isDefault',
    });
    ```
  - Keep version 1 schema intact (Dexie handles migration automatically)
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/db.ts
  npm run build
  ```

---

### Step 3: Add Sender Address DB Operations

- **Files:** `src/hooks/use-lyncis-db.ts`
- **Change:**
  - Add `useSenderAddresses()` reactive hook — returns all sender addresses sorted by label
  - Add `addSenderAddress(address: Omit<SenderAddress, 'id'>): Promise<string>` — generates UUID, adds to DB
  - Add `updateSenderAddress(id: string, changes: Partial<SenderAddress>): Promise<void>`
  - Add `deleteSenderAddress(id: string): Promise<void>`
  - Add `setDefaultSenderAddress(id: string): Promise<void>` — sets one as default, clears others
- **Verify:**
  ```bash
  npx tsc --noEmit src/hooks/use-lyncis-db.ts
  npm run build
  ```

---

### Step 4: Add Batch Status Mutations

- **Files:** `src/hooks/use-lyncis-db.ts`
- **Change:**
  - Add `stageOrders(ids: string[], batchId: string): Promise<void>` — sets `status: 'staged'` and `batchId` for given IDs, atomic transaction
  - Add `unstageOrders(ids: string[]): Promise<void>` — reverts `status: 'unassigned'`, clears `batchId`, clears logistics data
  - Add `commitBatch(ids: string[], logisticsMap: Record<string, Partial<JastipOrder['logistics']>>): Promise<void>` — sets `status: 'processed'`, saves per-order logistics, atomic transaction
  - Add `cancelBatch(batchId: string): Promise<void>` — finds all orders with this batchId, reverts to `unassigned`, clears `batchId`
  - Add `useStagedOrders(): JastipOrder[]` — reactive hook returning all orders with `status === 'staged'`
- **Verify:**
  ```bash
  npx tsc --noEmit src/hooks/use-lyncis-db.ts
  npm run build
  ```

---

### Step 5: Build Logistics Calculation Utility

- **Files:** `src/lib/logistics.ts`
- **Change:**
  - `calculateVolumetricWeight(l: number, w: number, h: number): number` — returns `(l * w * h) / 6000`, rounds to 2 decimals
  - `calculateChargeableWeight(actualWeight: number, volumetricWeight: number): number` — returns `Math.max(actualWeight, volumetricWeight)`
  - All dimensions in cm, weights in kg
  - Guard: if any dimension is 0 or negative, volumetric = 0
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/logistics.ts
  ```

---

### Step 6: Build Logistics Unit Tests

- **Files:** `src/lib/__tests__/logistics.test.ts`
- **Change:**
  - Test cases:
    - Volumetric: 30×20×10 = 1.0 kg
    - Volumetric: 50×40×30 = 10.0 kg
    - Chargeable: max(2.5, 1.0) = 2.5
    - Chargeable: max(0.5, 1.0) = 1.0
    - Edge: zero dimension → volumetric = 0
    - Edge: negative dimension → volumetric = 0
- **Verify:**
  ```bash
  npx jest src/lib/__tests__/logistics.test.ts
  ```

---

### Step 7: Build Zone Mapping & Pricing Data

- **Files:** `src/lib/shipping-zones.ts`
- **Change:**
  - Define 7 zone groups:
    ```ts
    type ShippingZone = 'JABODETABEK' | 'JAWA' | 'BALI_NUSA' | 'SUMATERA' | 'KALIMANTAN' | 'SULAWESI' | 'MALUKU_PAPUA';
    ```
  - Create `PROVINCE_TO_ZONE: Record<string, ShippingZone>` mapping all 34 provinces from `location.json` to their zone group
  - Create `SERVICE_LABELS: Record<ServiceType, string>` — Bahasa labels: `{ regular: 'Regular', nextday: 'Next Day', sameday: 'Same Day', instant: 'Instant' }`
  - Create `ZONE_RATES: { originZone: ShippingZone, destZone: ShippingZone, service: ServiceType, ratePerKg: number, minCharge: number }[]`
    - Populate with realistic sample rates (e.g., JABODETABEK→JABODETABEK Regular = Rp 8,000/kg, JABODETABEK→MALUKU_PAPUA Next Day = Rp 35,000/kg)
  - Export `getZoneForProvince(province: string): ShippingZone | null` — lookup with fuzzy matching for province name variations
  - Export `getShippingRate(originZone: ShippingZone, destZone: ShippingZone, service: ServiceType): { ratePerKg: number; minCharge: number } | null`
  - Export `calculateShippingCost(chargeableWeight: number, ratePerKg: number, minCharge: number): number` — returns `Math.max(chargeableWeight * ratePerKg, minCharge)`
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/shipping-zones.ts
  npm run build
  ```

---

### Step 8: Build Zone Pricing Unit Tests

- **Files:** `src/lib/__tests__/shipping-zones.test.ts`
- **Change:**
  - Test cases:
    - `getZoneForProvince('DKI Jakarta')` → `'JABODETABEK'`
    - `getZoneForProvince('Jawa Barat')` → `'JAWA'`
    - `getZoneForProvince('Papua')` → `'MALUKU_PAPUA'`
    - `getZoneForProvince('Unknown')` → `null`
    - `getShippingRate('JABODETABEK', 'JAWA', 'regular')` → returns rate object
    - `calculateShippingCost(2.5, 8000, 10000)` → `20000` (above min)
    - `calculateShippingCost(0.5, 8000, 10000)` → `10000` (below min, use minCharge)
- **Verify:**
  ```bash
  npx jest src/lib/__tests__/shipping-zones.test.ts
  ```

---

### Step 9: Build Order Completion Validator

- **Files:** `src/lib/order-validator.ts`
- **Change:**
  - `interface ValidationResult { isComplete: boolean; issues: string[] }`
  - `validateOrderForBatch(order: JastipOrder): ValidationResult`
    - Check: `recipient.name` not empty → else push "Nama penerima kosong"
    - Check: `recipient.phone` not empty → else push "No. telepon kosong"
    - Check: `recipient.addressRaw` not empty → else push "Alamat kosong"
    - Check: `items.length > 0` → else push "Tidak ada barang"
    - Check: at least one item has `unitPrice > 0` → else push "Semua barang belum ada harga"
    - `isComplete = issues.length === 0`
  - `validateBatch(orders: JastipOrder[]): { allComplete: boolean; results: Map<string, ValidationResult> }`
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/order-validator.ts
  npm run build
  ```

---

### Step 10: Build Floating Action Bar (FAB)

- **Files:** `src/components/lyncis/bucket/floating-action-bar.tsx`
- **Change:**
  - Fixed-bottom bar with `position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%)`
  - Only visible when `selectedIds.size > 0` or when staged orders exist
  - Two modes:
    - **No active batch**: Shows "X pesanan dipilih" + "Proses Batch" button + "Hapus" button
    - **Active batch exists**: Shows "X pesanan dipilih" + "Tambah ke Batch" button + "Hapus" button
  - Also shows "Buka Batch (N)" button when staged orders exist (even if nothing selected)
  - Animate in/out with CSS transition (`translate-y + opacity`)
  - Glassmorphism style (backdrop-blur, semi-transparent background)
  - Props: `selectedCount`, `stagedCount`, `hasBatch`, `onProcessBatch`, `onAddToBatch`, `onOpenBatch`, `onDelete`
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/bucket/floating-action-bar.tsx
  npm run build
  ```

---

### Step 11: Build Batch Wizard — Completion Gate (Step 1 of Wizard)

- **Files:** `src/components/lyncis/fulfillment/completion-gate.tsx`
- **Change:**
  - Receives: `orders: JastipOrder[]`, `onProceed`, `onRemoveOrder`, `onEditOrder`
  - Uses `validateBatch()` from `order-validator.ts`
  - Renders a list of order cards, each showing:
    - Recipient name + tag
    - Green check (✅) if complete, red indicators if incomplete with specific issue messages
    - ✕ button to remove from batch (calls `onRemoveOrder`)
    - ✏️ button to edit order (opens edit sheet inline)
  - "Lanjutkan" button at bottom — disabled until `allComplete === true`
  - Counter at top: "X dari Y pesanan lengkap"
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/fulfillment/completion-gate.tsx
  npm run build
  ```

---

### Step 12: Build Batch Wizard — Logistics Input (Step 2 of Wizard)

- **Files:** `src/components/lyncis/fulfillment/logistics-input.tsx`
- **Change:**
  - Receives: `orders: JastipOrder[]`, `senderAddress: SenderAddress | null`, `logisticsState: Record<string, OrderLogisticsForm>`, `onUpdate`, `onProceed`, `onBack`
  - `OrderLogisticsForm` shape:
    ```ts
    { serviceType: ServiceType; weight: number; l: number; w: number; h: number; volumetric: number; chargeable: number; estimatedCost: number }
    ```
  - Per-order card showing:
    - Recipient name + destination city/province (read-only)
    - Service type dropdown (Regular / Next Day / Same Day / Instant)
    - Weight input (kg, decimal)
    - L × W × H inputs (cm)
    - Auto-calculated: volumetric weight, chargeable weight, estimated cost
    - Costs recalculate live when any input changes (uses `getShippingRate` + sender zone)
  - Running totals header: total orders, total chargeable weight, total estimated cost
  - "Lanjutkan" button — disabled until all orders have `weight > 0`
  - "Kembali" button → back to completion gate
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/fulfillment/logistics-input.tsx
  npm run build
  ```

---

### Step 13: Build Batch Wizard — Origin/Sender Selector (Step 3 of Wizard)

- **Files:** `src/components/lyncis/fulfillment/origin-selector.tsx`
- **Change:**
  - Receives: `senderAddresses: SenderAddress[]`, `selectedId: string | null`, `onSelect`, `onAddNew`, `onProceed`, `onBack`
  - Dropdown of saved sender addresses showing label + city
  - Pre-selects the default address if one exists
  - "Tambah Alamat Baru" button opens inline form:
    - Reuses the address autocomplete component from `order-form-content.tsx` pattern
    - Fields: Label, Name, Phone, AddressRaw, Provinsi, Kota, Kecamatan, Kelurahan, Kodepos
    - "Simpan" saves to `senderAddresses` table and selects it
  - "Lanjutkan" button — disabled until a sender is selected
  - "Kembali" button → back to logistics input
  - Note: when sender changes, logistics input prices must recalculate (parent handles this)
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/fulfillment/origin-selector.tsx
  npm run build
  ```

---

### Step 14: Build Batch Wizard — Summary View (Step 4 of Wizard)

- **Files:** `src/components/lyncis/fulfillment/batch-summary.tsx`
- **Change:**
  - Receives: `orders: JastipOrder[]`, `senderAddress: SenderAddress`, `logisticsState: Record<string, OrderLogisticsForm>`, `onConfirm`, `onEditOrder`, `onBack`
  - Header card: sender name + city, total orders, total chargeable weight, total estimated cost
  - Per-order compact cards (read-only):
    - Recipient name → destination city
    - Service label | chargeable weight | estimated cost
    - ✏️ icon → calls `onEditOrder(orderId)` to jump back to logistics input with focus
  - Footer: "Kembali" + "Buat Pengiriman" button (prominent, green/primary)
  - Confirmation dialog on "Buat Pengiriman" click: "Buat X pengiriman?" with Konfirmasi/Batal
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/fulfillment/batch-summary.tsx
  npm run build
  ```

---

### Step 15: Build Batch Wizard — Main Container

- **Files:** `src/components/lyncis/fulfillment/batch-wizard.tsx`
- **Change:**
  - Shadcn `<Sheet>` with `side="right"` and full-height styling
  - Internal stepper state: `step: 1 | 2 | 3 | 4`
  - Manages all wizard state:
    - `logisticsState: Record<string, OrderLogisticsForm>` (per-order logistics form data)
    - `selectedSenderId: string | null`
    - `step: number`
  - Fetches staged orders via `useStagedOrders()`
  - Fetches sender addresses via `useSenderAddresses()`
  - Step navigation:
    - Step 1 → `<CompletionGate>` → Step 2
    - Step 2 → `<LogisticsInput>` → Step 3
    - Step 3 → `<OriginSelector>` → Step 4
    - Step 4 → `<BatchSummary>` → commit
  - On "Buat Pengiriman": calls `commitBatch()` → success toast → close sheet
  - On "Batalkan Batch": calls `cancelBatch()` → info toast → close sheet
  - Sheet header shows batch step indicator (e.g., "Langkah 2 dari 4 — Logistik")
  - When sender changes in Step 3, recalculates all prices in `logisticsState`
  - Handles "remove order" from gate → calls `unstageOrders([id])`, removes from local state
  - Handles "edit order" from gate → opens inline edit (or reuses existing edit sheet)
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/fulfillment/batch-wizard.tsx
  npm run build
  ```

---

### Step 16: Update Status Badge for 'staged'

- **Files:** `src/components/lyncis/bucket/order-table.tsx`
- **Change:**
  - Add `staged` to `STATUS_CONFIG`:
    ```ts
    staged: { label: 'Siap Kirim', variant: 'warning' }
    ```
  - Ensure the `StatusBadge` component renders a yellow/amber badge for `staged` orders
  - Ensure staged orders are still visible in the table (not filtered out)
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/bucket/order-table.tsx
  npm run build
  ```

---

### Step 17: Wire FAB + Wizard into Main Page

- **Files:** `src/app/page.tsx`
- **Change:**
  - Import `FloatingActionBar` and `BatchWizard`
  - Add state: `batchWizardOpen: boolean`, `activeBatchId: string | null`
  - Add `useStagedOrders()` query to detect active batch
  - Compute `hasBatch = stagedOrders.length > 0`
  - Wire FAB:
    - "Proses Batch" → generate batchId, call `stageOrders(selectedIds, batchId)`, clear selection, open wizard
    - "Tambah ke Batch" → call `stageOrders(selectedIds, activeBatchId)`, clear selection, open wizard
    - "Buka Batch" → open wizard (staged orders already exist)
    - "Hapus" → existing bulk delete with confirmation
  - Wire BatchWizard:
    - `open={batchWizardOpen}`, `onClose` sets `batchWizardOpen = false`
    - On commit success → clear `activeBatchId`
    - On cancel batch → clear `activeBatchId`
  - Add bottom padding to table area when FAB is visible to prevent content overlap
  - Clear `selectedIds` when tag filter changes
- **Verify:**
  ```bash
  npx tsc --noEmit src/app/page.tsx
  npm run build
  npm run dev
  # Full flow: select orders → FAB appears → click "Proses Batch" → wizard opens
  ```

---

### Step 18: Update Tag Sidebar for Staged Count

- **Files:** `src/hooks/use-lyncis-db.ts`, `src/components/lyncis/bucket/tag-sidebar.tsx`
- **Change:**
  - Update `useTagCounts()` to also track `staged` count per tag:
    ```ts
    counts[tag] = { total: 0, unassigned: 0, staged: 0 }
    ```
  - Update sidebar to show staged count indicator (e.g., a small orange badge "3 siap kirim")
  - Tag lifecycle: tags where all orders are `processed` → "Riwayat" section
  - Tags with any `unassigned` or `staged` → active section
- **Verify:**
  ```bash
  npm run build
  npm run dev
  # Stage some orders → sidebar shows staged count
  ```

---

### Step 19: End-to-End Flow Smoke Test

- **Files:** None (manual testing)
- **Change:** No code changes. Full manual verification:
  1. Create 5 test orders (via WhatsApp paste or manual entry)
  2. Select 3 orders → FAB appears → click "Proses Batch"
  3. Orders become staged (yellow badge in table)
  4. Completion gate: verify all 3 are complete, click "Lanjutkan"
  5. Logistics input: enter weight/dims/service for each order, see pricing
  6. Origin selector: add a new sender address, select it, see prices recalculate
  7. Summary: review all orders, use quick edit to change one service type
  8. Click "Buat Pengiriman" → confirm → orders become processed (green badge)
  9. Go back to table → select 2 more orders → "Tambah ke Batch" should not appear (no active batch)
  10. Verify tag moves to "Riwayat" if all orders processed
- **Verify:**
  ```bash
  npm run build  # production build still passes
  npm run dev    # manual E2E test
  ```

---

## Risks & Mitigations

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Dexie v2 migration fails for existing users | Test with existing data before deploying. Dexie auto-migrates. Keep v1 schema as-is. |
| 2 | Zone rate table has missing routes | Default to most expensive zone + show "Tarif estimasi" warning |
| 3 | FAB covers bottom table rows | Add `pb-20` padding to table container when FAB is visible |
| 4 | Wizard Sheet conflicts with edit Sheet | Only one Sheet open at a time; close edit sheet before wizard opens |
| 5 | Large batch (50+ orders) is slow in wizard | Use `useMemo` for all computed values; debounce weight/dim inputs |
| 6 | Province name mismatches between location.json and zone mapping | Use case-insensitive fuzzy matching in `getZoneForProvince()` |
| 7 | User cancels wizard mid-way, staged orders left in limbo | "Batalkan Batch" reverts all staged → unassigned. Also show warning badge in sidebar. |
| 8 | Partial commit failure | Use `db.transaction()` for atomic commit. All-or-nothing. |

## Rollback Plan

- **Per-step rollback**: Each step is self-contained. Revert by removing the specific files created.
- **Schema rollback**: If Dexie v2 migration fails, revert `db.ts` to v1. users will need to clear IndexedDB data.
- **Full Phase 3 rollback**: Remove these directories/files:
  - `src/components/lyncis/fulfillment/*`
  - `src/components/lyncis/bucket/floating-action-bar.tsx`
  - `src/lib/logistics.ts`, `src/lib/shipping-zones.ts`, `src/lib/order-validator.ts`
  - Revert changes in `src/lib/types.ts`, `src/lib/db.ts`, `src/hooks/use-lyncis-db.ts`, `src/app/page.tsx`
