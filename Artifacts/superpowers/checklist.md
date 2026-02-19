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
- [ ] Phase 3: Shipping & Logistics Hub
- [x] Intake Zone renders on main page
- [x] Excel upload flow works end-to-end
- [x] WhatsApp paste flow works end-to-end
- [x] Imported orders appear in table immediately
- [x] Tag filter updates to include new tags

### PHASE 3 — Fulfillment & Batching Logic

#### Step 3.1: Build the Multi-Select State Manager
- [x] `toggle` adds/removes from set (✅ Implemented in Page component)
- [x] `selectAll` sets all provided IDs
- [x] `deselectAll` clears
- [ ] `count` returns `Set.size`
- [x] Header checkbox selects/deselects all visible rows

#### Step 3.2: Build the Floating Action Bar (FAB)
- [ ] Appears when ≥1 order selected
- [ ] Displaced when 0 selected
- [ ] Shows selected count with Bahasa label
- [ ] Total items count correct
- [ ] Total weight correct
- [ ] Total price correct (formatted as Rupiah)
- [ ] "Proses Batch" button opens drawer
- [ ] "Hapus" button with confirmation dialog
- [ ] Smooth CSS transition in/out

#### Step 3.3: Build the Logistics Calculation Utility
- [ ] Volumetric formula: `(L*W*H)/6000`
- [ ] Chargeable formula: `Math.max(finalWeight, volumetricWeight)`
- [ ] Edge case: zero dimensions
- [ ] All tests pass

#### Step 3.4: Build the Origins Static Data
- [ ] At least 5 origin hubs defined
- [ ] `getOriginById` lookup works
- [ ] `getOriginName` returns fallback for unknown ID
- [ ] All data matches `Origin` interface

#### Step 3.5: Build the Batch Drawer
- [ ] Sheet slides from right
- [ ] Origin select populated from static list
- [ ] Each order card shows recipient name + tag
- [ ] `finalPackedWeight` input per order
- [ ] L, W, H inputs per order
- [ ] Volumetric weight auto-calculates live
- [ ] Chargeable weight auto-calculates live, displayed bold
- [ ] Batch summary totals correct
- [ ] "Konfirmasi & Proses" bulk-updates orders:
- [ ] `status` → `'processed'`
- [ ] All `logistics` fields saved
- [ ] Success toast shown
- [ ] Selection cleared after processing
- [ ] Drawer closes
- [ ] Table reflects updated status immediately

#### Step 3.6: Wire Fulfillment Into Main Page
- [ ] FAB appears on selection
- [ ] "Proses Batch" opens drawer
- [ ] After processing: orders show "Selesai / Terkirim" badge
- [ ] After processing: tag moves to "Riwayat" if all orders processed
- [ ] Full flow works without errors

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

#### Step 4.3: Bahasa Indonesia Labels Audit
- [x] `LABELS` object has all entries from both spec doc dictionaries
- [x] All component files import from `LABELS`
- [x] No hardcoded English strings in user-facing UI
- [x] Status badges use correct Bahasa labels (Bucket Baru, Siap Kirim, Selesai)

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
- [ ] Loading skeletons for data fetch
- [ ] Loading spinner for Excel/LLM parsing
- [x] Currency formatted as "Rp X.XXX" (Indonesian format)
- [x] Dates formatted in Indonesian locale
- [ ] Weight formatted as "X,XX kg"
- [ ] FAB animation smooth
- [ ] Error boundary wraps main content
