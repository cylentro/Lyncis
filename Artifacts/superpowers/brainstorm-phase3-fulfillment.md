# Brainstorm — Phase 3: Fulfillment & Batching Logic (v2)

## Goal

Enable Lyncis users to select orders, validate their completeness, enter per-order logistics (weight, dimensions, service type with zone-based pricing), select a saved sender address, review a clean summary, and commit the batch — transitioning orders through a 3-state lifecycle: `unassigned → staged → processed`.

---

## Decisions (Locked)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Completion Check | **Block** | Incomplete orders (missing name/phone/address/items) cannot enter the batch flow |
| Service Type | **Per-order** | Each order can have a different logistics service (Regular, Next Day, Same Day, Instant) |
| Pricing | **Zone-based per kg** | Rate = f(origin zone, destination zone, service type) × chargeable weight |
| Origin/Sender | **Saved addresses** | Users maintain a list of sender addresses (reusable, selectable from dropdown) |
| Summary | **View-only + quick edit** | Confirmation screen is read-only, but each order card has a pencil icon to jump back and edit |
| Status Model | **3-state** | `unassigned` → `staged` (batch prepared) → `processed` (shipment confirmed) |

---

## Business Flow (6 Steps)

### Step 1: Select Orders
- User checks orders in the bucket table
- FAB appears: "X pesanan dipilih" + "Proses Batch" + "Hapus"
- Clicking "Proses Batch" opens the batch wizard

### Step 2: Check Order Completion (Gate)
- System scans each selected order for completeness:
  - ✅ Recipient name present
  - ✅ Phone number present
  - ✅ Address present (addressRaw not empty)
  - ✅ At least 1 item with unitPrice > 0
- **If any order fails**: Show a blocking screen listing incomplete orders with red indicators
  - User must fix them (edit button per order) before proceeding
  - "Lanjutkan" button stays disabled until all pass
- **If all pass**: Auto-advance to Step 3

### Step 3: Input Logistics Per Order
For each order, a card showing:
- **Recipient summary**: Name, destination city/province (read-only)
- **Service type dropdown**: Regular | Next Day | Same Day | Instant
- **Weight input**: `finalPackedWeight` (kg)
- **Dimension inputs**: L × W × H (cm)
- **Auto-calculated**:
  - Volumetric weight: `(L × W × H) / 6000`
  - Chargeable weight: `max(finalPackedWeight, volumetricWeight)`
  - **Estimated shipping cost**: `chargeableWeight × zoneRate(origin, destination, service)`
- Running batch total at the top (total weight, total estimated cost)

### Step 4: Select Origin (Sender Address)
- Dropdown of saved sender addresses
- Each address has: name, phone, addressRaw, provinsi, kota, kecamatan, kelurahan, kodepos
- "Tambah Alamat Baru" option to add a new sender inline
- Selected sender applies to ALL orders in this batch
- Changing sender recalculates all pricing (zone changes)

### Step 5: Summary (View-Only Confirmation)
Minimalist overview:
```
┌──── Ringkasan Batch ─────────────────────────┐
│  Pengirim: Gudang Batam, Kota Batam           │
│  Jumlah Pesanan: 12                           │
│  Total Berat Tagihan: 28.5 kg                 │
│  Total Estimasi Ongkir: Rp 342.000            │
│                                               │
│  ┌─ Mba Dini ──────────────────────── ✏️ ──┐  │
│  │ → Jakarta Selatan | Regular | 2.5 kg     │  │
│  │ Ongkir: Rp 25.600                        │  │
│  └──────────────────────────────────────────┘  │
│  ┌─ Pak Budi ──────────────────────── ✏️ ──┐  │
│  │ → Surabaya | Next Day | 4.2 kg           │  │
│  │ Ongkir: Rp 63.000                        │  │
│  └──────────────────────────────────────────┘  │
│                                               │
│  [ Kembali ]            [ Buat Pengiriman ]   │
└───────────────────────────────────────────────┘
```
- Each order card has a ✏️ icon → jumps back to Step 3 with that order focused
- "Kembali" returns to Step 4
- "Buat Pengiriman" commits the batch

### Step 6: Shipment Created
- Atomic DB transaction:
  - All orders: `status → 'processed'`
  - All logistics fields saved (weight, dims, volumetric, chargeable, originId, serviceType, estimatedCost)
- Success toast: "12 pengiriman berhasil dibuat"
- Selection cleared, wizard closes
- Table updates reactively
- Tags with 100% processed orders → move to "Riwayat"

---

## Data Model Changes

### New: `SenderAddress` (stored in IndexedDB)
```ts
interface SenderAddress {
  id: string;
  label: string;         // "Gudang Batam"
  name: string;          // "PT Maju Jaya"
  phone: string;
  addressRaw: string;
  provinsi: string;
  kota: string;
  kecamatan: string;
  kelurahan: string;
  kodepos: string;
  zone: string;          // derived zone code for pricing
  isDefault: boolean;    // one address can be the default
}
```

### New: `ServiceType`
```ts
type ServiceType = 'regular' | 'nextday' | 'sameday' | 'instant';
```

### Updated: `JastipOrder.logistics`
```ts
logistics: {
  originId: string;           // links to SenderAddress.id
  serviceType: ServiceType;   // NEW
  finalPackedWeight: number;
  dimensions: { l: number; w: number; h: number };
  volumetricWeight: number;
  chargeableWeight: number;
  estimatedCost: number;      // NEW — zone-based pricing result
};
```

### New: Zone-Based Rate Table
```ts
interface ZoneRate {
  originZone: string;     // e.g., "BATAM"
  destinationZone: string; // e.g., "JABODETABEK"
  service: ServiceType;
  ratePerKg: number;       // in IDR
  minCharge: number;        // minimum shipping cost
}
```

Zone mapping: Province/City → Zone code (e.g., "DKI Jakarta" → "JABODETABEK", "Kepulauan Riau" → "BATAM")

---

## Constraints

1. **Offline-first**: All data in IndexedDB. Zone rates stored as static JSON.
2. **Existing infrastructure**: Checkbox multi-select already wired. Address autocomplete component reusable for sender addresses.
3. **3-state status**: `unassigned` (new) → `staged` (batch prepared but not confirmed) → `processed` (shipment created).
4. **Staged orders**: Can be "unstaged" (reverted to unassigned) if the user changes their mind before final confirmation.
5. **Zone-based pricing is an estimate**: Not a contractual price — it's for planning purposes.

---

## Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | Zone rate table becomes outdated | Wrong cost estimates | Make it a separate JSON file, easy to update |
| 2 | Province-to-zone mapping incomplete | Some destinations have no rate | Default to the most expensive zone + show warning |
| 3 | Wizard is multi-step — user loses progress | Frustration | Keep wizard state in React state (not DB) until final commit |
| 4 | Service type per order increases complexity | More UI elements per card | Use a compact dropdown, not radio buttons |
| 5 | Saved sender addresses need CRUD | Another DB table to manage | Leverage existing Dexie patterns; reuse address autocomplete |
| 6 | Batch with 50+ orders is unwieldy | Scrolling fatigue | Add virtualized scrolling or pagination inside the wizard |
| 7 | Completion gate may frustrate users | "Why can't I proceed?" | Clear error messages pointing to each incomplete field |

---

## UI Component Architecture

```
page.tsx
├── OrderTable (existing, with checkboxes)
├── FloatingActionBar (new, lightweight)
│   ├── Selection count
│   ├── "Proses Batch" button → opens BatchWizard
│   └── "Hapus" button → confirmation dialog
└── BatchWizard (new, Sheet/Dialog)
    ├── Step 1: CompletionGate
    │   └── List of incomplete orders with edit buttons
    ├── Step 2: LogisticsInput
    │   ├── Per-order cards (service, weight, dims, pricing)
    │   └── Running totals header
    ├── Step 3: OriginSelector
    │   ├── Saved address dropdown
    │   └── "Add New" inline form (reuses AddressFields component)
    ├── Step 4: BatchSummary
    │   ├── Summary header (totals)
    │   ├── Per-order summary cards (read-only + edit icon)
    │   └── "Buat Pengiriman" button
    └── SuccessState (toast + auto-close)
```

---

## Acceptance Criteria

1. **Selection**: Checkboxes toggle selection. FAB appears with "X pesanan dipilih".
2. **Completion Gate**: Incomplete orders are listed with red indicators. "Lanjutkan" disabled until all orders are complete. Each order has an edit button.
3. **Logistics Input**: Per-order cards show service dropdown, weight/dim inputs, auto-calculated volumetric, chargeable weight, and estimated cost.
4. **Service Types**: Regular, Next Day, Same Day, Instant — selectable per order.
5. **Zone Pricing**: Estimated cost = chargeableWeight × zoneRate(origin→destination, service). Recalculates when sender, weight, dims, or service changes.
6. **Saved Sender Addresses**: Dropdown of previously saved addresses. Can add new inline. Selected sender applies to all orders.
7. **Summary**: Clean read-only view with per-order cards. Quick edit (✏️) jumps back to logistics input for that order.
8. **Commit**: Atomic transaction: all orders → `status: 'processed'`, all logistics fields saved.
9. **Post-Commit**: Selection cleared, wizard closes, success toast, table updates, tags lifecycle respected.
10. **3-State Status**: Orders flow `unassigned → staged → processed`. Staged orders can be reverted.
11. **Responsive**: Wizard works on mobile (≥375px). Cards stack vertically.
