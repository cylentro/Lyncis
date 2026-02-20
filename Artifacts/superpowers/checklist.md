# Project Checklist


### PHASE 0 — Project Scaffold

#### Step 0.1: Initialize Next.js 15 Project
- [x] `create-next-app` completes without error
- [x] `src/app/layout.tsx` exists
- [x] `src/app/page.tsx` exists
- [x] `tailwind.config.ts` exists
- [x] Dev server starts on port 3000

#### Step 0.2: Install Core Dependencies
- [x] `dexie` in dependencies
- [x] `dexie-react-hooks` in dependencies
- [x] `uuid` in dependencies
- [x] `@types/uuid` in devDependencies

#### Step 0.3: Initialize Shadcn/UI
- [x] `components.json` exists
- [x] `src/lib/utils.ts` exists with `cn()` utility
- [x] Tailwind config updated with Shadcn paths

#### Step 0.4: Install Required Shadcn/UI Components
- [x] `button.tsx` exists in `src/components/ui/`
- [x] `table.tsx` exists
- [x] `dialog.tsx` exists
- [x] `sheet.tsx` exists
- [x] `tabs.tsx` exists
- [x] `card.tsx` exists
- [x] `badge.tsx` exists
- [x] `select.tsx` exists
- [x] `command.tsx` exists
- [x] `popover.tsx` exists
- [x] `checkbox.tsx` exists
- [x] `dropdown-menu.tsx` exists
- [x] `form.tsx` exists
- [x] `lucide-react` installed

#### Step 0.5: Create Type Definitions (`lib/types.ts`)
- [x] `OrderStatus` type exported
- [x] `JastipItem` interface exported with all 7 fields
- [x] `Origin` interface exported with all 3 fields
- [x] `JastipOrder` interface exported with `id`, `createdAt`, `tag`, `status`
- [x] `JastipOrder.recipient` has all 7 address fields
- [x] `JastipOrder.items` is `JastipItem[]`
- [x] `JastipOrder.logistics` has all 5 fields including nested `dimensions`
- [x] `isManualTotal` field present with comment explaining its purpose

#### Step 0.6: Create Database Layer (`lib/db.ts`)
- [x] `LyncisDatabase` class extends `Dexie`
- [x] `orders!: Table<JastipOrder>` declared
- [x] Constructor calls `super('LyncisDB')`
- [x] Schema indexes: `'++id, tag, status, createdAt'`
- [x] `db` singleton exported

#### Step 0.7: Create Component Directory Structure
- [x] `src/components/lyncis/` directory exists
- [x] `bucket/` subdirectory exists
- [x] `intake/` subdirectory exists
- [x] `fulfillment/` subdirectory exists
- [x] `shared/` subdirectory exists

#### Step 0.8: Create App Layout & Landing Page Shell
- [x] `<html lang="id">` set
- [x] Page title is "Lyncis"
- [x] Sonner `<Toaster />` mounted
- [x] Global CSS has Tailwind directives
- [x] Landing page renders without errors
- [x] Font is loaded (not browser default)

### PHASE 1 — Foundation & The Open Bucket

#### Step 1.1: Create Reactive Database Hook (`hooks/use-lyncis-db.ts`)
- [x] `useOrders` function exported — uses `useLiveQuery`, accepts optional filter
- [x] `addOrder` generates UUID via `uuidv4()`, calls `db.orders.add()`
- [x] `addOrders` bulk inserts with `db.orders.bulkAdd()`
- [x] `updateOrder` calls `db.orders.update(id, changes)`
- [x] `bulkUpdateOrders` uses `db.transaction` for atomic bulk update
- [x] `deleteOrder` calls `db.orders.delete(id)`
- [x] `deleteOrders` calls `db.orders.bulkDelete(ids)`
- [x] `getActiveTags` filters orders where `status === 'unassigned'`, returns unique tags
- [x] `getAllTags` returns all distinct tags from all orders
- [x] TypeScript compiles without errors

#### Step 1.2: Build the Open Bucket Table Component
- [x] Uses Shadcn `<Table>`, `<TableHeader>`, `<TableBody>`, `<TableRow>`, `<TableCell>`
- [x] Checkbox column for multi-select
- [x] "Nama Penerima" column displays `recipient.name`
- [x] "Alamat Lengkap" column displays truncated `recipient.addressRaw`
- [x] "Tag / Nama Event" column displays `tag`
- [x] "Items" column shows item count
- [x] "Total Harga" column shows sum of all `items[].totalPrice`
- [x] Status badge with correct colors and Bahasa labels
- [x] Edit and Delete action buttons with Lucide icons
- [x] Empty state renders when no orders
- [x] Sorted by `createdAt` descending

#### Step 1.3: Build the Tag Sidebar Filter
- [x] "Semua Pesanan" always at top, acts as "show all"
- [x] Active tags listed with dot indicator
- [x] Order count shown next to each tag
- [x] Archived tags in collapsible "Riwayat" section
- [x] Clicking a tag calls `onTagSelect(tag)` callback
- [x] Uses `<ScrollArea>` for long tag lists
- [x] Active tag highlighted visually

#### Step 1.4: Build the Circular Pricing Logic Utility
- [x] `updateUnitPrice` sets `isManualTotal = false`, recalcs `totalPrice`
- [x] `updateTotalPrice` sets `isManualTotal = true`, recalcs `unitPrice`
- [x] `updateQuantity` branches on `isManualTotal` flag
- [x] `Math.max(1, qty)` guard in all qty-dependent calculations
- [x] All functions are immutable (return new object)
- [x] Test file covers all 6 edge cases
- [x] All tests pass

#### Step 1.5: Build the Order Edit Modal
- [x] Dialog opens with existing order data pre-filled
- [x] All 7 recipient fields present with Bahasa labels
- [x] Items section: repeatable rows with add/remove
- [x] Changing `Harga Satuan` triggers `updateUnitPrice` → `Total Harga` updates
- [x] Changing `Total Harga` triggers `updateTotalPrice` → `Harga Satuan` updates, `isManualTotal = true`
- [x] Changing `Qty` respects `isManualTotal` flag
- [x] `Qty` cannot go below 1 (UI min + guard)
- [x] Tag autocomplete shows active tags
- [x] "Simpan" persists changes to Dexie
- [x] "Batal" discards changes and closes

#### Step 1.6: Build the Order Create Dialog
- [x] Opens with empty form, correct defaults
- [x] Tag field required, supports autocomplete + free text
- [x] At least one item required validation
- [x] Circular pricing works on new items
- [x] Calls `addOrder()` on save
- [x] Success toast shown
- [x] New order appears in table immediately (reactive)
- [x] Persists across page reload

#### Step 1.7: Assemble the Open Bucket Page
- [x] Sidebar and table render side-by-side on desktop
- [x] Sidebar collapses to `<Sheet>` on mobile
- [x] "Tambah Pesanan" button opens create dialog
- [x] Tag filter updates table content
- [x] Edit button opens edit dialog with correct data
- [x] Delete button shows confirmation, then removes order
- [x] Order count updates in header
- [x] All data survives page reload

### PHASE 2 — The Smart Intake Zone (Intelligence Layer)

#### Step 2.1: Build the Intake Zone Layout with Tabs
- [x] Two tabs with icons and labels
- [x] Tab switching works
- [x] Card wrapper with title

#### Step 2.2: Build the Excel Upload Component (Part 1 — File Parsing)
- [x] `xlsx` package installed
- [x] `parseExcelFile` function reads file, extracts headers + rows
- [x] Drag-and-drop zone styled
- [x] File input accepts `.xlsx`, `.xls`, `.csv`
- [x] Headers and row count shown after parse
- [x] Error state shown on parse failure

#### Step 2.3: Build the Sticky Header Mapping System
- [x] Header hash: normalize, sort, join, Base64
- [x] `localStorage` read/write for mappings
- [x] Mapping dialog shows all Excel headers with dropdowns
- [x] Auto-populates if hash matches saved mapping
- [x] Preview of first 3 rows
- [x] "Simpan Mapping" saves to `localStorage`
- [x] Re-uploading same file format skips mapping dialog

#### Step 2.4: Build Excel-to-Orders Conversion
- [x] Maps string values to correct `JastipOrder` fields
- [x] Parses numeric fields safely (NaN → 0)
- [x] Sets defaults for unassigned/missing fields
- [x] `createdAt` set to current timestamp
- [x] `status` defaults to `'unassigned'`
- [x] Returns array of orders ready for `addOrders()`

#### Step 2.5: Wire Excel Upload End-to-End
- [x] Full file → parse → hash → map → convert → import flow works
- [x] Saved mapping auto-applied on matching hash
- [x] Success toast shows imported count
- [x] File input cleared after import
- [x] Tag input allows setting default tag for batch

#### Step 2.6: Build WhatsApp Text Parser (Regex Engine)
- [x] Regex patterns for name (5+ variants)
- [x] Regex patterns for phone (5+ variants + number format)
- [x] Regex patterns for address (3+ variants + multi-line)
- [x] Regex patterns for items with qty + price
- [x] Multi-order detection (double newline / numbered lists)
- [x] `getParsingConfidence` returns 0-1 score
- [x] Test cases pass for all formats

#### Step 2.7: Build LLM Fallback (Gemini Flash Integration)
- [x] `@google/generative-ai` installed
- [x] System prompt returns `JastipOrder` JSON structure
- [x] Response parsed as JSON safely
- [x] Error handling & reporting: Distinguishes quota/network vs format errors (✅)
- [x] API errors handled gracefully (suggests formatting tips on failure)
- [x] Works only when online (offline = skip)
- [x] API key loaded from `.env.local`

#### Step 2.8: Build WhatsApp Paste UI Component
- [x] Textarea with Bahasa placeholder
- [x] "Parse" button triggers regex parser
- [x] Confidence check: ≥0.6 shows preview, <0.6 prompts LLM
- [x] Preview shows parsed order cards (optimized with text wrapping, no elipsis)
- [x] Fields editable in preview before import
- [x] Confidence indicator (green ≥0.8, yellow ≥0.6, red <0.6)
- [x] "Import ke Bucket" saves to DB
- [x] Tag input for batch tagging
- [x] Success toast on import

#### Step 2.9: Wire Intake Zone into Main Page
- [x] Excel Upload: File parsing with `xlsx`
- [x] Header Mapping: Sticky mapping system using `localStorage`
- [x] WhatsApp Parser: Regex-based engine for ID formats
- [x] AI Fallback: Gemini Flash integration for messy text
- [x] Intake UI: Tabbed Intake Zone in Bucket Page (Implemented as `UnifiedIntakeDialog`)
- [x] Intake Zone renders on main page
- [x] Excel upload flow works end-to-end
- [x] WhatsApp paste flow works end-to-end
- [x] Imported orders appear in table immediately
- [x] Tag filter updates to include new tags

### PHASE 3 — Fulfillment & Batching Logic

#### Step 3.1: Expand Data Models & Schema
- [x] `ServiceType` definition ('regular', 'nextday', 'sameday', 'instant')
- [x] `SenderAddress` interface with full address fields + default flag
- [x] `JastipOrder.logistics` updated with `serviceType` and `estimatedCost`
- [x] Dexie schema updated (v2) with `senderAddresses` table
- [x] `SenderAddress` CRUD hooks (`useSenderAddresses`, `add`, `update`, `delete`, `setDefault`)
- [x] Batch mutations (`stageOrders`, `unstageOrders`, `commitBatch`, `cancelBatch`)

#### Step 3.2: Build Logistics Engine
- [x] `calculateVolumetricWeight` (L*W*H/6000)
- [x] `calculateChargeableWeight` (max of actual/volumetric)
- [x] Zone Groups (~7 zones mapping 34 provinces)
- [x] `getZoneForProvince` utility (fuzzy matching)
- [x] `calculateShippingCost` using zone rates & service type
- [x] Unit tests for all logistics & pricing logic pass

#### Step 3.3: Build Batch Wizard Components
- [x] **Step 1: Completion Gate** — Checks for missing fields, blocking invalid orders (Validator built)
- [x] **Step 2: Logistics Input** — Per-order weight, dims, services type, live pricing
- [x] **Step 3: Origin Selector** — Dropdown of saved sender addresses + inline add
- [x] **Step 4: Summary** — Read-only view with totals & quick-edit links
- [x] **Batch Wizard Container** — Manages stepped flow, stage persistence, and atomic commit

#### Step 3.4: Wire Fulfillment into Main Page
- [x] **FAB** — Shows "Proses Batch" / "Tambah ke Batch" / "Buka Batch"
- [x] **Staged Status** — Table badges update to "Siap Kirim" (yellow)
- [x] **Sidebar** — Shows count of staged orders
- [x] **Atomic Commit** — "Buat Pengiriman" transitions ALL staged → processed (green)
- [x] **Tag Lifecycle** — Move to "Riwayat" when all orders processed

### PHASE 4 — Polish & PWA

#### Step 4.1: Build the Indonesian Address Dictionary
- [x] All 38 Indonesian provinces listed
- [x] Major cities per province (at least top 5)
- [x] `getProvinces()` returns sorted list
- [x] `getCities()` returns cities for given province
- [x] `getKecamatan()` returns kecamatan list
- [x] `getKelurahan()` returns kelurahan list
- [x] `inferFromKecamatan()` does reverse lookup

#### Step 4.2: Add Address Autocomplete to Order Dialogs
- [x] Provinsi autocomplete works
- [x] Kota filters based on selected Provinsi
- [x] Kecamatan filters based on selected Kota
- [x] Kelurahan filters based on selected Kecamatan
- [x] Cascading reset on parent change
- [x] Auto-inference from unique Kecamatan
- [x] Integrated in both create and edit dialogs

#### Step 4.3: Localized Dictionary (i18n)
- [x] Implement LanguageProvider for dynamic switching
- [x] English and Bahasa Indonesia dictionaries (`src/i18n/dictionaries`)
- [x] User-facing labels map dynamically (Bucket Baru, Siap Kirim, Selesai)
- [x] Toggle UI implemented in navigation
- [x] Dynamic String Replacements (e.g. `{count} pesanan`)

#### Step 4.4: PWA Configuration
- [ ] `@serwist/next` installed and configured
- [ ] `manifest.json` has correct name, icons, display mode
- [ ] Manifest linked in `<head>`
- [ ] Service worker registers
- [ ] App works offline (except LLM)
- [ ] Basic Lighthouse PWA checks pass

#### Step 4.5: Final Polish — Responsive Design & Micro-Interactions
- [x] Mobile responsive (320px minimum)
- [x] Tablet responsive (768px)
- [x] Desktop full layout (1024px+)
- [x] Layout Fix: Address text wrapping (no ellipsis/overlap) in table and preview (✅)
- [x] Auto-Reset UI: WhatsApp extraction expands back to input automatically when all items deleted (✅)
- [x] Hover UX: AI Badge & Phone number hide on hover to prevent icon overlap (✅)
- [x] Loading skeletons for data fetch
- [x] Loading spinner for Excel/LLM parsing
- [x] Currency formatted as "Rp X.XXX" (Indonesian format)
- [x] Dates formatted in Indonesian locale
- [x] Weight formatted as "X,XX kg"
- [x] FAB animation smooth
- [x] Error boundary wraps main content

#### Step 4.6: Advanced AI & Parsing Refinements
- [x] Configurable AI Engine: Support for Gemini and Gemma via `.env` (✅)
- [x] Model-Specific Optimizations: `responseSchema` for Gemini, Template-based for Gemma (✅)
- [x] Advanced Price Reconciliation: 3-case back-calculation logic for missing unit/total prices (✅)
- [x] Structural Parsing: ZIPCODE awareness prevents confusion with item prices (✅)
- [x] AI Guardrails: Strict location lookup (80k records) with 0.4 confidence threshold (✅)
- [x] Optimized Token utilization (Lean prompts + schema-first extraction) (✅)

#### Step 4.7: UI/UX Standardization
- [x] Standardized Item Delete: Vibrant red rounded squares inside cards across all modes (✅)
- [x] Multi-Mode Clarity: Distinct "Edit" vs "Review" workflows with context-aware labels (✅)
- [x] Sidebar Fix: Responsive toggle behavior across all screen sizes (✅)
- [x] Tag Autocomplete: Alphabetical sorting and "General" tag permanence (✅)
- [x] Active Tag Suggester: Only shows tags with unassigned orders in intake forms (✅)

#### Step 4.8: Batch Safety & UI Enhancements
- [x] Secure Contextual State: Clear handling of empty orders in top navigation `commitBatch` (✅)
- [x] Batch Guardrails: AlertDialogs implemented for "Keluarkan Terpilih" & "Kosongkan Batch" (✅)
- [x] Table Analytics: SKU count and Total Pcs tracked in dashboard "Barang" column (✅)
