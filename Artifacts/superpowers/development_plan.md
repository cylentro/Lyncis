# Lyncis POC — Detailed Implementation Plan (Option A)

## Goal

Build the full Lyncis POC application following the Sequential 3-Phase approach as prescribed in `context.md` and `requirement.md`. Every component, type, hook, and UI element must be implemented without omission.

## Assumptions

1. **Greenfield project** — no existing source code; we start from scratch.
2. **Node.js ≥ 18** is installed on the machine.
3. **Single developer** — no branching strategy needed for POC.
4. **Shadcn/UI** will be initialized via its CLI (components added individually).
5. **Gemini 2.5 Flash** API key will be provided by the user when we reach the LLM fallback step.
6. **No deployment** for POC — local dev server (`npm run dev`) is sufficient.
7. **Indonesian address dictionary** will be a static JSON file bundled with the app.

---

## Plan

---

### PHASE 0 — Project Scaffold

---

#### Step 0.1: Initialize Next.js 15 Project

- **Files:** Project root (all generated files)
- **Change:**
  - Run `npx -y create-next-app@latest ./ --ts --tailwind --eslint --app --src-dir --import-alias "@/*"` (non-interactive).
  - Verify the generated folder structure includes `src/app/`, `tailwind.config.ts`, `tsconfig.json`.
- **Verify:**
  ```bash
  ls src/app/layout.tsx src/app/page.tsx tailwind.config.ts tsconfig.json package.json
  npm run dev  # Should start on localhost:3000 without errors
  ```
---

#### Step 0.2: Install Core Dependencies

- **Files:** `package.json`
- **Change:**
  - Install runtime deps: `npm install dexie dexie-react-hooks uuid`
  - Install dev deps: `npm install -D @types/uuid`
- **Verify:**
  ```bash
  cat package.json | grep -E "dexie|uuid"
  # Should show dexie, dexie-react-hooks, uuid in dependencies
  ```
---

#### Step 0.3: Initialize Shadcn/UI

- **Files:** `components.json`, `src/lib/utils.ts`, `tailwind.config.ts`
- **Change:**
  - Run `npx -y shadcn@latest init` with defaults (New York style, Zinc base color, CSS variables).
  - Verify `components.json` is created at root level.
- **Verify:**
  ```bash
  ls components.json src/lib/utils.ts
  cat components.json
  ```
---

#### Step 0.4: Install Required Shadcn/UI Components

- **Files:** `src/components/ui/` (multiple files)
- **Change:**
  - Install all needed Shadcn components one batch at a time:
    ```
    npx -y shadcn@latest add button input label table dialog sheet
    npx -y shadcn@latest add tabs card badge separator scroll-area
    npx -y shadcn@latest add select command popover checkbox
    npx -y shadcn@latest add dropdown-menu toast sonner
    npx -y shadcn@latest add form textarea tooltip
    ```
  - Install `lucide-react` if not already present: `npm install lucide-react`
- **Verify:**
  ```bash
  ls src/components/ui/
  # Should list: button.tsx, input.tsx, label.tsx, table.tsx, dialog.tsx, sheet.tsx,
  # tabs.tsx, card.tsx, badge.tsx, separator.tsx, scroll-area.tsx,
  # select.tsx, command.tsx, popover.tsx, checkbox.tsx,
  # dropdown-menu.tsx, toast.tsx/sonner.tsx, form.tsx, textarea.tsx, tooltip.tsx
  ```
---

#### Step 0.5: Create Type Definitions (`lib/types.ts`)

- **Files:** `src/lib/types.ts`
- **Change:**
  - Define exactly as per `requirement.md` §2 File A:
    - `OrderStatus` type: `'unassigned' | 'staged' | 'processed'`
    - `JastipItem` interface with fields: `id`, `name`, `qty`, `unitPrice`, `totalPrice`, `rawWeightKg`, `isManualTotal`
    - `Origin` interface with fields: `id`, `name`, `code`
    - `JastipOrder` interface with:
      - Top-level: `id`, `createdAt`, `tag`, `status`
      - Nested `recipient`: `name`, `phone`, `addressRaw`, `provinsi`, `kota`, `kecamatan`, `kelurahan`, `kodepos`
      - `items: JastipItem[]`
      - Nested `logistics`: `originId`, `finalPackedWeight`, `dimensions: {l, w, h}`, `volumetricWeight`, `chargeableWeight`
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/types.ts
  # Should compile without errors
  ```
---

#### Step 0.6: Create Database Layer (`lib/db.ts`)

- **Files:** `src/lib/db.ts`
- **Change:**
  - Define exactly as per `requirement.md` §2 File B:
    - `LyncisDatabase` class extending `Dexie`
    - `orders` table of type `Table<JastipOrder>`
    - Version 1 schema: `orders: '++id, tag, status, createdAt'`
    - Export `db` singleton instance
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/db.ts
  # Should compile without errors
  ```
---

#### Step 0.7: Create Component Directory Structure

- **Files:** Multiple directories
- **Change:**
  - Create `src/components/lyncis/` (per `context.md` constraint).
  - Create subdirectories for logical grouping:
    ```
    src/components/lyncis/bucket/      # Open Bucket table, filters
    src/components/lyncis/intake/      # Excel upload, WhatsApp parser
    src/components/lyncis/fulfillment/ # Batch drawer, logistics
    src/components/lyncis/shared/      # Shared components (tag input, address fields)
    ```
- **Verify:**
  ```bash
  ls -la src/components/lyncis/
  # Should show: bucket/, intake/, fulfillment/, shared/
  ```
---

#### Step 0.8: Create App Layout & Landing Page Shell

- **Files:** `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- **Change:**
  - Update `layout.tsx`:
    - Set HTML lang to `"id"` (Bahasa Indonesia)
    - Set metadata title: `"Lyncis — Data Cleaning House"`
    - Add Sonner `<Toaster />` provider
    - Import Google Font (Inter or similar)
  - Update `globals.css`:
    - Ensure Tailwind directives are present
    - Add any global custom CSS variables
  - Update `page.tsx`:
    - Create a minimal shell with a header ("Lyncis") and a main content area placeholder
    - This will be replaced with actual Bucket UI in Phase 1
- **Verify:**
  ```bash
  npm run dev
  # Open http://localhost:3000 — should show "Lyncis" header with styled layout
  ```
---

### PHASE 1 — Foundation & The Open Bucket

---

#### Step 1.1: Create Reactive Database Hook (`hooks/use-lyncis-db.ts`)

- **Files:** `src/hooks/use-lyncis-db.ts`
- **Change:**
  - Import `useLiveQuery` from `dexie-react-hooks`
  - Import `db` from `@/lib/db`
  - Import `v4 as uuidv4` from `uuid`
  - Implement and export the following functions:
    - `useOrders(filters?: { tag?: string; status?: OrderStatus })` — reactive query with optional tag/status filter, sorted by `createdAt` desc
    - `addOrder(order: Omit<JastipOrder, 'id'>): Promise<string>` — adds single order with generated UUID, returns id
    - `addOrders(orders: Omit<JastipOrder, 'id'>[]): Promise<void>` — bulk add with generated UUIDs
    - `updateOrder(id: string, changes: Partial<JastipOrder>): Promise<void>` — partial update
    - `bulkUpdateOrders(ids: string[], changes: Partial<JastipOrder>): Promise<void>` — bulk partial update
    - `deleteOrder(id: string): Promise<void>` — single delete
    - `deleteOrders(ids: string[]): Promise<void>` — bulk delete
    - `getActiveTags(): string[]` — returns tags with ≥1 `unassigned` order (reactive via `useLiveQuery`)
    - `getAllTags(): string[]` — returns all distinct tags (reactive)
- **Verify:**
  ```bash
  npx tsc --noEmit src/hooks/use-lyncis-db.ts
  # Should compile without errors
  ```
---

#### Step 1.2: Build the Open Bucket Table Component

- **Files:** `src/components/lyncis/bucket/order-table.tsx`
- **Change:**
  - Use Shadcn `<Table>` component
  - Columns: Checkbox (for multi-select), Nama Penerima, Alamat Lengkap, Tag, Items (count), Total Harga, Status, Actions
  - Sorting by `createdAt` (newest first, default)
  - Each row shows truncated address (first 40 chars + ellipsis)
  - Status rendered as `<Badge>` with color coding:
    - `unassigned` → gray badge, label "Bucket Baru"
    - `staged` → yellow badge, label "Siap Kirim"
    - `processed` → green badge, label "Selesai / Terkirim"
  - Actions column: Edit button (pencil icon), Delete button (trash icon)
  - Empty state: message "Belum ada pesanan. Mulai dengan menambahkan data."
  - Accept `orders` and callback props from parent
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/bucket/order-table.tsx
  npm run dev
  # Open browser — table should render (empty state)
  ```
---

#### Step 1.3: Build the Tag Sidebar Filter

- **Files:** `src/components/lyncis/bucket/tag-sidebar.tsx`
- **Change:**
  - Vertical sidebar showing all tags as clickable items
  - "Semua Pesanan" (All Orders) option at top — selected by default
  - Active tags (≥1 unassigned) shown with a dot indicator
  - Archived tags (100% processed) shown in a separate "Riwayat" (History) collapsible section
  - Clicking a tag filters the order table by that tag
  - Show order count per tag
  - Use Shadcn `<ScrollArea>` for overflow
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/bucket/tag-sidebar.tsx
  npm run dev
  # Sidebar renders with "Semua Pesanan" at top
  ```
---

#### Step 1.4: Build the Circular Pricing Logic Utility

- **Files:** `src/lib/pricing.ts`
- **Change:**
  - Pure utility functions (no React, no side effects) implementing `requirement.md` §3A:
  - `updateUnitPrice(item: JastipItem, newUnitPrice: number): JastipItem`
    - Sets `unitPrice = newUnitPrice`
    - Sets `totalPrice = qty * newUnitPrice`
    - Sets `isManualTotal = false`
  - `updateTotalPrice(item: JastipItem, newTotalPrice: number): JastipItem`
    - Sets `totalPrice = newTotalPrice`
    - Sets `unitPrice = newTotalPrice / Math.max(1, qty)`
    - Sets `isManualTotal = true`
  - `updateQuantity(item: JastipItem, newQty: number): JastipItem`
    - `qty = Math.max(1, newQty)` (guard)
    - If `isManualTotal === true`: keep `totalPrice`, recalc `unitPrice = totalPrice / qty`
    - If `isManualTotal === false`: keep `unitPrice`, recalc `totalPrice = qty * unitPrice`
  - All functions return a new object (immutable).
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/pricing.ts
  ```
  - Create test file `src/lib/__tests__/pricing.test.ts` with cases:
    - Unit price update recalculates total
    - Total price update recalculates unit and sets `isManualTotal = true`
    - Qty update with `isManualTotal = true` keeps total, recalcs unit
    - Qty update with `isManualTotal = false` keeps unit, recalcs total
    - Qty = 0 is guarded to 1 (no division by zero)
    - Qty = negative is guarded to 1
  ```bash
  npx jest src/lib/__tests__/pricing.test.ts
  # All 6 test cases pass
  ```
---

#### Step 1.5: Build the Order Edit Modal

- **Files:** `src/components/lyncis/bucket/order-edit-dialog.tsx`
- **Change:**
  - Shadcn `<Dialog>` with form sections:
  - **Section: Penerima (Recipient)**
    - `Nama Penerima` — text input for `recipient.name`
    - `No. Telepon` — text input for `recipient.phone`
    - `Alamat Lengkap` — textarea for `recipient.addressRaw`
    - `Provinsi` — text input for `recipient.provinsi`
    - `Kota / Kabupaten` — text input for `recipient.kota`
    - `Kecamatan` — text input for `recipient.kecamatan`
    - `Kelurahan` — text input for `recipient.kelurahan`
    - `Kode Pos` — text input for `recipient.kodepos`
  - **Section: Barang (Items)**
    - Repeatable item rows with fields:
      - `Nama Barang` — text input
      - `Qty` — number input (min 1)
      - `Harga Satuan` — number input (triggers `updateUnitPrice`)
      - `Total Harga` — number input (triggers `updateTotalPrice`)
      - `Berat (kg)` — number input for `rawWeightKg`
      - Remove button (trash icon)
    - "Tambah Barang" (Add Item) button at bottom
    - Circular pricing logic wired using `src/lib/pricing.ts` functions
  - **Section: Tag**
    - Tag input with autocomplete from `getActiveTags()`
  - **Footer:** "Simpan" (Save) button, "Batal" (Cancel) button
  - On save: call `updateOrder()` from hook
  - On cancel: close dialog, discard changes
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/bucket/order-edit-dialog.tsx
  npm run dev
  # Open dialog — all fields render correctly
  # Test: change unit price → total updates
  # Test: change total price → unit updates
  # Test: change qty with manual total → total stays, unit recalcs
  ```
---

#### Step 1.6: Build the Order Create Dialog

- **Files:** `src/components/lyncis/bucket/order-create-dialog.tsx`
- **Change:**
  - Similar structure to edit dialog but for new orders
  - Pre-fills:
    - `status: 'unassigned'`
    - `createdAt: Date.now()`
    - `id: uuidv4()`
    - `logistics`: all zeros/nulls
  - Tag field is required (with autocomplete + free text)
  - At least one item required before saving
  - On save: call `addOrder()` from hook
  - Show success toast via Sonner
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/bucket/order-create-dialog.tsx
  npm run dev
  # Create a new order → appears in table
  # Verify it persists across page reload (IndexedDB)
  ```
---

#### Step 1.7: Assemble the Open Bucket Page

- **Files:** `src/app/page.tsx`
- **Change:**
  - Layout: sidebar (tag filter) on left + main content (order table) on right
  - Header bar with:
    - "Lyncis" logo/title
    - "Tambah Pesanan" (Add Order) button → opens create dialog
    - Order count indicator
  - Wire up state:
    - `selectedTag` state → passed to `useOrders` filter
    - `selectedOrderIds` Set state → passed to table checkboxes
    - Edit dialog: `editingOrder` state → opens edit dialog with order data
    - Delete confirmation: prompt before delete
  - Responsive: sidebar collapses to a sheet on mobile (`<Sheet>`)
- **Verify:**
  ```bash
  npm run dev
  # Full flow: Create order → see in table → filter by tag → edit order → delete order
  # All CRUD operations work
  # Page reload preserves data
  ```
---

### PHASE 2 — The Smart Intake Zone (Intelligence Layer)

---

#### Step 2.1: Build the Intake Zone Layout with Tabs

- **Files:** `src/components/lyncis/intake/intake-zone.tsx`
- **Change:**
  - Shadcn `<Tabs>` component with two tabs:
    - Tab 1: "Upload Excel" (icon: FileSpreadsheet from Lucide)
    - Tab 2: "Paste WhatsApp" (icon: MessageSquare from Lucide)
  - Wrap in a Shadcn `<Card>` with title "Intake Zone — Tambah Data"
  - This component is placed on the main page (above or beside the bucket table, TBD in UI layout)
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/intake/intake-zone.tsx
  npm run dev
  # Tabs render, switching between them works
  ```
---

#### Step 2.2: Build the Excel Upload Component (Part 1 — File Parsing)

- **Files:** `src/components/lyncis/intake/excel-upload.tsx`, `src/lib/excel-parser.ts`
- **Change:**
  - Install `xlsx` (SheetJS): `npm install xlsx`
  - `excel-parser.ts`:
    - `parseExcelFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }>`
    - Read file as ArrayBuffer → parse with XLSX → extract first sheet → return headers + rows
  - `excel-upload.tsx`:
    - Drag-and-drop zone (styled div) + hidden `<input type="file" accept=".xlsx,.xls,.csv">`
    - On file drop/select: call `parseExcelFile()` → store headers + rows in state
    - Show file name and row count after successful parse
    - Show error state if file parsing fails
- **Verify:**
  ```bash
  npm list xlsx  # Should be installed
  npx tsc --noEmit src/lib/excel-parser.ts
  npm run dev
  # Upload a test .xlsx file → headers and row count displayed
  ```
---

#### Step 2.3: Build the Sticky Header Mapping System

- **Files:** `src/lib/header-mapper.ts`, `src/components/lyncis/intake/column-mapping-dialog.tsx`
- **Change:**
  - `header-mapper.ts`:
    - `generateHeaderHash(headers: string[]): string`
      - Normalize: trim + lowercase each header
      - Sort alphabetically
      - Join with `|`
      - Return Base64 encoded string
    - `loadSavedMapping(hash: string): Record<string, string> | null`
      - Check `localStorage` key `lyncis_header_maps_${hash}`
      - Return parsed JSON or null
    - `saveMappingForHash(hash: string, mapping: Record<string, string>): void`
      - Save to `localStorage`
    - Target fields for mapping:
      - `recipient.name`, `recipient.phone`, `recipient.addressRaw`
      - `items[0].name`, `items[0].qty`, `items[0].unitPrice`, `items[0].totalPrice`
      - `tag`
  - `column-mapping-dialog.tsx`:
    - Shadcn `<Dialog>` showing:
      - Left column: Excel headers (from parsed file)
      - Right column: Dropdown selects for target fields
      - Auto-populated if saved mapping exists for this hash
      - "Simpan Mapping" button — saves mapping + processes the import
    - Preview: show first 3 rows mapped to `JastipOrder` structure
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/header-mapper.ts
  npm run dev
  # Upload Excel → mapping dialog appears → map columns → save → reload → re-upload same file → mapping auto-applied
  ```
---

#### Step 2.4: Build Excel-to-Orders Conversion

- **Files:** `src/lib/excel-to-orders.ts`
- **Change:**
  - `convertRowsToOrders(rows: Record<string, string>[], mapping: Record<string, string>, defaultTag: string): Omit<JastipOrder, 'id'>[]`
    - For each row, map values to `JastipOrder` fields using the mapping
    - Parse numeric fields (qty, prices, weight)
    - Generate `createdAt: Date.now()`
    - Set `status: 'unassigned'`
    - Set `tag` from mapped column or `defaultTag`
    - Initialize `logistics` with zeros/nulls
    - Handle missing or invalid data gracefully (default to empty string / 0)
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/excel-to-orders.ts
  npm run dev
  # Upload Excel → map columns → orders appear in bucket table
  ```
---

#### Step 2.5: Wire Excel Upload End-to-End

- **Files:** `src/components/lyncis/intake/excel-upload.tsx` (update)
- **Change:**
  - Complete flow:
    1. User drops/selects file → `parseExcelFile()`
    2. Generate header hash → check `localStorage` for saved mapping
    3. If mapping exists: auto-apply → show confirmation with row count → user clicks "Import"
    4. If no mapping: show `<ColumnMappingDialog>` → user maps → save mapping → import
    5. Call `addOrders()` from hook → show success toast with count
    6. Clear file input
  - Add a tag input at top (default tag for all imported orders)
- **Verify:**
  ```bash
  npm run dev
  # Full flow: upload → map (first time) → import → orders in table
  # Re-upload same format → auto-mapped → import
  ```
---

#### Step 2.6: Build WhatsApp Text Parser (Regex Engine)

- **Files:** `src/lib/whatsapp-parser.ts`
- **Change:**
  - `parseWhatsAppText(text: string): Partial<JastipOrder>[]`
  - Implement regex patterns for common Jastip markers:
    - Name patterns: `Nama:`, `Name:`, `Penerima:`, `Atas Nama:`, `A/N:`
    - Phone patterns: `HP:`, `No HP:`, `Telp:`, `WA:`, `No. Telepon:`, phone number regex (08xx, +62xx)
    - Address patterns: `Alamat:`, `Almt:`, `Addres:`, multi-line until next marker
    - Item patterns: `Barang:`, `Item:`, `Pesanan:`, with qty (e.g., "2x Pocky Matcha")
    - Price patterns: `Harga:`, `Total:`, `@`, currency patterns (Rp, IDR)
  - Entry separator: detect multiple orders by double-newline or numbered lists (1., 2., etc.)
  - Return array of partially filled `JastipOrder` objects
  - Export `getParsingConfidence(result: Partial<JastipOrder>): number` — score 0-1 based on how many fields were extracted
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/whatsapp-parser.ts
  ```
  - Create test file `src/lib/__tests__/whatsapp-parser.test.ts` with test cases:
    - Standard format: "Nama: John\nHP: 0812xxx\nAlamat: Jl. xxx"
    - Shorthand format: "A/N: Siti, WA: 0813xxx, Almt: ..."
    - Multiple orders separated by double newline
    - Items with qty: "2x Pocky Matcha @30000"
    - Edge: missing fields → partial result with low confidence
  ```bash
  npx jest src/lib/__tests__/whatsapp-parser.test.ts
  ```
---

#### Step 2.7: Build LLM Fallback (Gemini Flash Integration)

- **Files:** `src/lib/llm-parser.ts`
- **Change:**
  - `parsewithLLM(text: string): Promise<Partial<JastipOrder>[]>`
  - Use Gemini 2.5 Flash API (Google Generative AI SDK)
  - Install: `npm install @google/generative-ai`
  - System prompt: instruct the model to extract `JastipOrder` JSON structure from raw WhatsApp text
  - Parse response as JSON array
  - Handle API errors gracefully (return empty array, show toast)
  - API key stored in `.env.local` as `NEXT_PUBLIC_GEMINI_API_KEY` (or server-side route)
  - Add timeout (10 seconds) and retry (1 retry on timeout)
  - Note: this is the ONLY feature that requires internet connectivity
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/llm-parser.ts
  # Manual test: paste complex WhatsApp text → LLM parses it
  ```
---

#### Step 2.8: Build WhatsApp Paste UI Component

- **Files:** `src/components/lyncis/intake/whatsapp-paste.tsx`
- **Change:**
  - Large `<Textarea>` with placeholder "Paste teks WhatsApp di sini..."
  - "Parse" button triggers parsing flow:
    1. Run `parseWhatsAppText()` (regex, Tier 1)
    2. Check confidence score
    3. If confidence ≥ 0.6: show parsed results in preview
    4. If confidence < 0.6: show "Confidence rendah, gunakan AI?" prompt → call `parseWithLLM()` (Tier 2)
  - Preview section:
    - Card per detected order showing: name, phone, address (partial), items
    - Editable fields before import
    - Confidence indicator (green/yellow/red)
  - "Import ke Bucket" button — calls `addOrders()` with default tag
  - Tag input for default tag assignment
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/intake/whatsapp-paste.tsx
  npm run dev
  # Paste WhatsApp text → parse → preview → import → orders in bucket
  ```
---

#### Step 2.9: Wire Intake Zone into Main Page

- **Files:** `src/app/page.tsx` (update)
- **Change:**
  - Add `<IntakeZone>` component above the bucket table (or as a collapsible section)
  - Both Excel and WhatsApp tabs should be functional
  - Orders added via intake appear immediately in the bucket table (reactive via `useLiveQuery`)
- **Verify:**
  ```bash
  npm run dev
  # Full intake flow: Excel upload → orders in table
  # Full intake flow: WhatsApp paste → parse → import → orders in table
  ```
- **Phase 2 Completion Checklist:**
  - [x] Excel Upload: File parsing with `xlsx`
  - [x] Header Mapping: Sticky mapping system using `localStorage`
  - [x] WhatsApp Parser: Regex-based engine for ID formats
  - [x] AI Fallback: Gemini Flash integration for messy text
  - [x] Intake UI: Tabbed Intake Zone in Bucket Page
---

### PHASE 3 — Fulfillment & Batching Logic

---

#### Step 3.1: Build the Multi-Select State Manager

- **Files:** `src/hooks/use-selection.ts`
- **Change:**
  - Custom hook: `useSelection()`
    - `selectedIds: Set<string>` state
    - `toggle(id: string)` → add/remove from set
    - `selectAll(ids: string[])` → set all
    - `deselectAll()` → clear set
    - `isSelected(id: string): boolean`
    - `count: number` → computed size
  - Wire into the bucket table checkboxes
- **Verify:**
  ```bash
  npx tsc --noEmit src/hooks/use-selection.ts
  npm run dev
  # Check/uncheck rows → selection count updates
  ```
---

#### Step 3.2: Build the Floating Action Bar (FAB)

- **Files:** `src/components/lyncis/bucket/floating-action-bar.tsx`
- **Change:**
  - Fixed-bottom bar that appears when `selectedIds.size > 0`
  - Shows:
    - Selected count: "X pesanan dipilih"
    - Summary stats:
      - Total items count (sum across all selected orders)
      - Total estimated weight (sum of `items[].rawWeightKg * qty`)
      - Total price (sum of all `items[].totalPrice`)
    - Action buttons:
      - "Proses Batch" → opens batch drawer
      - "Ubah Status" → dropdown to change status
      - "Hapus" → bulk delete with confirmation
  - Animate in/out with CSS transition
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/bucket/floating-action-bar.tsx
  npm run dev
  # Select orders → FAB appears → shows correct stats → click "Proses Batch"
  ```
---

#### Step 3.3: Build the Logistics Calculation Utility

- **Files:** `src/lib/logistics.ts`
- **Change:**
  - `calculateVolumetricWeight(l: number, w: number, h: number): number`
    - Returns `(l * w * h) / 6000`
  - `calculateChargeableWeight(finalWeight: number, volumetricWeight: number): number`
    - Returns `Math.max(finalWeight, volumetricWeight)`
  - All dimensions in cm, weight in kg
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/logistics.ts
  ```
  - Create test `src/lib/__tests__/logistics.test.ts`:
    - Volumetric: 30×20×10 = 1.0 kg
    - Chargeable: max(2.5, 1.0) = 2.5
    - Chargeable: max(0.5, 1.0) = 1.0
    - Edge: zero dimensions = 0
  ```bash
  npx jest src/lib/__tests__/logistics.test.ts
  ```
---

#### Step 3.4: Build the Origins Static Data

- **Files:** `src/lib/origins.ts`
- **Change:**
  - Static array of `Origin` objects:
    ```ts
    export const ORIGINS: Origin[] = [
      { id: 'hub-batam-01', name: 'Hub Batam', code: 'BTM-01' },
      { id: 'hub-jakarta-01', name: 'Hub Jakarta', code: 'JKT-01' },
      { id: 'hub-surabaya-01', name: 'Hub Surabaya', code: 'SBY-01' },
      // Add 3-5 more common hubs
    ];
    ```
  - Helper: `getOriginById(id: string): Origin | undefined`
  - Helper: `getOriginName(id: string): string` — returns name or "Belum Ditentukan"
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/origins.ts
  ```
---

#### Step 3.5: Build the Batch Drawer

- **Files:** `src/components/lyncis/fulfillment/batch-drawer.tsx`
- **Change:**
  - Shadcn `<Sheet>` (side drawer, slides from right)
  - Header: "Proses Batch — X pesanan"
  - Section 1: **Asal Pengiriman (Origin)**
    - Shadcn `<Select>` dropdown populated from `ORIGINS`
    - Selected origin applies to ALL orders in this batch
  - Section 2: **Detail Per Pesanan**
    - For each selected order, a card showing:
      - Recipient name + tag
      - `Berat Akhir (Setelah Packing)` — number input for `finalPackedWeight`
      - `Dimensi (cm)` — 3 number inputs for L, W, H
      - `Berat Volumetrik` — auto-calculated, read-only display
      - `Berat Tagihan` — auto-calculated (`chargeableWeight`), displayed prominently in bold
  - Section 3: **Ringkasan Batch (Batch Summary)**
    - Total orders
    - Total chargeable weight
    - Total items
  - Footer: "Konfirmasi & Proses" button
    - Updates all selected orders:
      - `status: 'processed'`
      - `logistics.originId`, `logistics.finalPackedWeight`, `logistics.dimensions`, `logistics.volumetricWeight`, `logistics.chargeableWeight`
    - Shows success toast
    - Clears selection
    - Closes drawer
- **Verify:**
  ```bash
  npx tsc --noEmit src/components/lyncis/fulfillment/batch-drawer.tsx
  npm run dev
  # Select orders → open batch drawer → pick origin → enter weights/dims → see chargeable weight → process
  # Orders status changes to "processed" in table
  ```
---

#### Step 3.6: Wire Fulfillment Into Main Page

- **Files:** `src/app/page.tsx` (update)
- **Change:**
  - Connect `<FloatingActionBar>` to selection state
  - Connect "Proses Batch" button to `<BatchDrawer>` open state
  - Ensure processed orders show correct badge in table
  - Ensure tag lifecycle works:
    - Tags with all orders processed → moved to "Riwayat" section in sidebar
    - Tags with remaining unassigned orders → still in active list
- **Verify:**
  ```bash
  npm run dev
  # Full E2E: Create orders → select → batch process → status updates → tag moves to archive
  ```
---

### PHASE 4 — Polish & PWA

---

#### Step 4.1: Build the Indonesian Address Dictionary

- **Files:** `src/lib/address-data.ts`
- **Change:**
  - Static JSON structure:
    ```ts
    interface AddressHierarchy {
      [provinsi: string]: {
        [kota: string]: {
          [kecamatan: string]: string[]; // array of kelurahan
        };
      };
    }
    ```
  - Cover all 38 Indonesian provinces with major cities and common kecamatan/kelurahan
  - Export functions:
    - `getProvinces(): string[]`
    - `getCities(provinsi: string): string[]`
    - `getKecamatan(provinsi: string, kota: string): string[]`
    - `getKelurahan(provinsi: string, kota: string, kecamatan: string): string[]`
    - `inferFromKecamatan(kecamatan: string): { provinsi: string; kota: string } | null` — reverse lookup
- **Verify:**
  ```bash
  npx tsc --noEmit src/lib/address-data.ts
  ```
---

#### Step 4.2: Add Address Autocomplete to Order Dialogs

- **Files:** `src/components/lyncis/shared/address-fields.tsx`, update `order-edit-dialog.tsx`, `order-create-dialog.tsx`
- **Change:**
  - `address-fields.tsx` — reusable component:
    - Provinsi: `<Combobox>` (Shadcn Command + Popover) with autocomplete from dictionary
    - Kota: `<Combobox>` filtered by selected Provinsi
    - Kecamatan: `<Combobox>` filtered by selected Kota
    - Kelurahan: `<Combobox>` filtered by selected Kecamatan
    - Kode Pos: text input
    - Cascading: selecting Provinsi resets Kota/Kecamatan/Kelurahan
    - Auto-inference: if user enters a unique Kecamatan, auto-fill Provinsi + Kota via `inferFromKecamatan()`
  - Wire this component into both create and edit dialogs (replace plain text inputs)
- **Verify:**
  ```bash
  npm run dev
  # Open edit dialog → type in Provinsi → autocomplete → select → Kota options filter
  # Enter unique Kecamatan → Provinsi + Kota auto-filled
  ```
---

#### Step 4.3: Bahasa Indonesia Labels Audit

- **Files:** All component files
- **Change:**
  - Create `src/lib/labels.ts` — centralized label constants:
    ```ts
    export const LABELS = {
      tag: 'Tag / Nama Event',
      recipientName: 'Nama Penerima',
      originId: 'Asal Pengiriman',
      chargeableWeight: 'Berat Tagihan',
      totalPrice: 'Total Harga',
      unassigned: 'Bucket Baru',
      staged: 'Siap Kirim',
      processed: 'Selesai / Terkirim',
      // ... all labels from both spec docs
    } as const;
    ```
  - Audit every component to use `LABELS` constants instead of hardcoded strings
  - Verify all user-facing text matches the UI/UX dictionaries from `context.md` and `requirement.md`
- **Verify:**
  ```bash
  npm run dev
  # Visually inspect all pages — all text in Bahasa Indonesia
  ```
---

#### Step 4.4: PWA Configuration

- **Files:** `next.config.ts`, `public/manifest.json`, `src/app/layout.tsx`
- **Change:**
  - Install `@serwist/next` (or `next-pwa`): `npm install @serwist/next`
  - Configure in `next.config.ts`:
    - Enable PWA with service worker
    - Cache static assets and app shell
  - Create `public/manifest.json`:
    - `name: "Lyncis"`, `short_name: "Lyncis"`, `theme_color`, `background_color`
    - Icons (generate 192x192 and 512x512 placeholder icons)
    - `display: "standalone"`, `start_url: "/"`
  - Add manifest link and meta tags in `layout.tsx`:
    - `<link rel="manifest" href="/manifest.json">`
    - `<meta name="theme-color">`
    - Apple touch icon
- **Verify:**
  ```bash
  npm run build && npm run start
  # Open Chrome DevTools → Application → Manifest shows correct data
  # Application → Service Workers shows a registered SW
  # Lighthouse PWA audit passes basic checks
  ```
---

#### Step 4.5: Final Polish — Responsive Design & Micro-Interactions

- **Files:** Various component files
- **Change:**
  - Ensure all layouts work on mobile (≥320px) and desktop
  - Add loading states (skeleton/spinner) for:
    - Initial data load from IndexedDB
    - Excel parsing
    - LLM parsing
  - Add transitions:
    - FAB slide-up animation
    - Dialog/Sheet open/close
    - Status badge change
  - Formatters:
    - Currency: `new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' })`
    - Weight: `X.XX kg`
    - Dates: `new Intl.DateTimeFormat('id-ID', { ... })`
  - Error boundaries for graceful failure
- **Verify:**
  ```bash
  npm run dev
  # Test on mobile viewport (320px, 375px, 768px, 1024px)
  # All interactive elements accessible
  # No broken layouts
  ```
---

#### Step 4.6: Advanced AI & Parsing Refinements

- **Files:** `src/lib/llm-parser.ts`, `src/lib/location-matcher.ts`
- **Change:**
  - **Model-Specific Prompts**: Gemini uses `responseSchema` for efficiency; Gemma uses a strict template.
  - **Price Reconciliation**: 3-case failure recovery ( derive `unitPrice` from `total/qty` or `total` from `unit*qty`).
  - **Structural Guardrails**: Rules to prevent ZIPCODE confusion and greedy boundary detection for address vs items.
  - **Location Table Strictness**: Use the 80k record internal table as the source of truth; leave fields blank if confidence < 0.4.
- **Verify:**
  ```bash
  npm run build
  # Test WhatsApp extraction with zipcodes and mixed price formats
  ```
---

#### Step 4.7: UI/UX Standardization

- **Files:** `src/components/lyncis/intake/whatsapp-paste.tsx`, `src/components/lyncis/bucket/order-form-content.tsx`
- **Change:**
  - **Standardized Delete**: Implement red rounded square delete buttons across all modes (Manual/Edit/Review).
  - **Hover UX**: Hide phone numbers and AI metadata during hover in extraction results to prevent UI clutter.
  - **Auto-Reset View**: Ensure the WhatsApp paste area returns to the input state automatically when all extracted items are deleted.
- **Verify:**
  ```bash
  npm run dev
  # Validate hover behavior and card deletion resetting the view.
  ```
---

## Risks & Mitigations

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Circular pricing infinite loop** | Pure functions with no reactive side effects; unit tests cover all 6 combinations |
| 2 | **Excel header hashing misses due to whitespace/casing** | Normalize (trim + lowercase) before hashing |
| 3 | **WhatsApp regex fails on unusual formats** | Confidence score + LLM fallback; preview allows manual correction |
| 4 | **Dexie/IndexedDB browser compatibility** | Target modern browsers only (Chrome, Edge, Safari 15+) for POC |
| 5 | **Large address dictionary bloats bundle** | Lazy-load via dynamic import; consider tree-shaking unused provinces |
| 6 | **Gemini API key exposure in client** | For POC: use `NEXT_PUBLIC_` env var. For production: move to API route |
| 7 | **Service worker caching stale data** | Use `@serwist/next` runtime caching with network-first for API, cache-first for assets |

## Rollback Plan

- **Per-step:** Each step is self-contained. Revert by removing/reverting the specific files listed.
- **Phase-level:** Each phase builds on the previous. Rolling back a phase means removing its component directories:
  - Phase 2: remove `src/components/lyncis/intake/`, `src/lib/excel-parser.ts`, `src/lib/header-mapper.ts`, `src/lib/whatsapp-parser.ts`, `src/lib/llm-parser.ts`
  - Phase 3: remove `src/components/lyncis/fulfillment/`, `src/lib/logistics.ts`, `src/lib/origins.ts`, `src/hooks/use-selection.ts`
- **Full rollback:** Delete project and re-scaffold from Phase 0.
- **Data safety:** IndexedDB data is independent of code; user data is never lost on code rollback.
