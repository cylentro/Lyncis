# LYNCIS MASTER SPECIFICATION (Phase 3)

This document serves as the consolidated source of truth for the **Lyncis (LJI-POC)** implementation. Use this file to guide the AI-Native IDE through the full development lifecycle.

## 1. PROJECT FOUNDATION & CORE DNA

**App Name:** Lyncis
**Mission:** A "Data Cleaning House" for Jastipers to transform unstructured WhatsApp/Excel data into logistics-ready batches.
**Stack:** Next.js 15 (App Router), Tailwind CSS, Shadcn/UI, Dexie.js (IndexedDB).
**Philosophy:** "Dump Now, Organize Later." Zero-friction intake with robust local persistence.

## 2. TECHNICAL ARCHITECTURE (File Setup)

### File A: `lib/types.ts`

```
export type OrderStatus = 'unassigned' | 'staged' | 'processed';

export interface JastipItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  rawWeightKg: number;
  isManualTotal: boolean; // IMPORTANT: Prevents circular logic from overriding manual price entries
}

export interface Origin {
  id: string;
  name: string;
  code: string; // e.g., "SG-WH-01"
}

export interface JastipOrder {
  id: string;
  createdAt: number;
  tag: string;
  status: OrderStatus;
  
  recipient: {
    name: string;
    phone: string;
    addressRaw: string;
    provinsi: string;
    kota: string;
    kecamatan: string;
    kelurahan: string;
    kodepos: string;
  };

  items: JastipItem[];

  logistics: {
    originId: string | null;
    finalPackedWeight: number;
    dimensions: { l: number; w: number; h: number };
    volumetricWeight: number;
    chargeableWeight: number;
  };
}
```

### File B: `lib/db.ts`

```
import Dexie, { type Table } from 'dexie';
import { JastipOrder } from './types';

export class LyncisDatabase extends Dexie {
  orders!: Table<JastipOrder>;

  constructor() {
    super('LyncisDB');
    this.version(1).stores({
      orders: '++id, tag, status, createdAt'
    });
  }
}

export const db = new LyncisDatabase();
```

## 3. CORE LOGIC RULES (MICRO-LOGIC)

### A. Circular Pricing Controller

- **Rule 1 (Unit Focus):** When `unitPrice` is edited, calculate `totalPrice = qty * unitPrice`. Set `isManualTotal = false`.
- **Rule 2 (Total Focus):** When `totalPrice` is edited, calculate `unitPrice = totalPrice / qty`. Set `isManualTotal = true`.
- **Rule 3 (Quantity Update):** If `qty` changes:

- If `isManualTotal` is `true`, keep `totalPrice` fixed and recalculate `unitPrice`.
- If `isManualTotal` is `false`, keep `unitPrice` fixed and recalculate `totalPrice`.
- **Guard:** Use `Math.max(1, qty)` to prevent division by zero.

### B. Tag Lifecycle

- **Active:** Tags with $\ge 1$ order where `status === 'unassigned'`. Show in intake autocomplete.
- **Archived:** Tags where 100% of orders are `status === 'processed'`. Hide from autocomplete.

### C. Logistics Calculation

- **Volumetric:** `(Length * Width * Height) / 6000`.
- **Chargeable:** `Math.max(finalWeight, volumetricWeight)`.

## 4. DETAILED IMPLEMENTATION WORKFLOW

### STEP 1: Foundation & The Open Bucket

- **Hook (`hooks/use-lyncis-db.ts`):** Reactive `useLiveQuery` to track order state. Expose `addOrders`, `updateOrder`, `bulkUpdateOrders`, and `getActiveTags`.
- **Bucket UI:** Shadcn Table with sorting by `createdAt`. Sidebar filters orders by `tag`.
- **The "Edit" Modal:** Contains the circular price logic defined in Section 3A.

### STEP 2: The Smart Intake Zone (Intelligence Layer)

- **Excel "Sticky Mapping":**

- **Hashing:** Sort all header strings alphabetically -> join with `|` -> generate Base64 hash.
- **Persistence:** Check `localStorage` for hash. If present, skip mapping. If absent, show mapping UI and save hash result.
- **WhatsApp Parser & "Regex Learning":**

- **Step 1:** Run local Regex patterns for (Name, Phone, Address).
- **Step 2 (Fallback):** If parsing fails, send text to Gemini Flash.
- **Step 3 (Learning):** (Optional) Save successful AI-parsed patterns as local strings to improve future Regex matching speed.
- **The "Open Bucket" Entry:** All parsed data must be tagged before hitting the database. Default to "Unassigned" status.

### STEP 3: Fulfillment & Batching Logic

- **Multi-Select:** Implement a `Set<string>` to track selected IDs.
- **Floating Action Bar:** Show summary stats (Total Weight, Total Price) for selected orders.
- **Batch Drawer:** * Assign `originId` (from a static list of Hubs).

- Input `finalPackedWeight` and `dimensions` (L,W,H).
- Display `chargeableWeight` prominently.
- **Commitment:** Bulk-modify orders to `status: 'processed'`.

## 5. UI/UX DICTIONARY (Bahasa Indonesia)

| Key | Label |
| --- | --- |
| `tag` | `Tag / Nama Event` |
| `recipient.name` | `Nama Penerima` |
| `logistics.originId` | `Asal Pengiriman` |
| `logistics.chargeableWeight` | `Berat Tagihan` |
| `items.totalPrice` | `Total Harga` |
| `unassigned` | `Bucket Baru` |
| `processed` | `Selesai / Terkirim` |