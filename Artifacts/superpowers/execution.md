# Lyncis POC — Phase 1 Execution Log

---

## Step 1.1: Create Reactive Database Hook ✅
- **Files:** `src/hooks/use-lyncis-db.ts`
- **What changed:**
  - Created `useOrders` (reactive, filtered by tag/status, sorted createdAt desc)
  - Created `useActiveTags`, `useAllTags`, `useTagCounts` (reactive queries)
  - Created mutation functions: `addOrder`, `addOrders`, `updateOrder`, `bulkUpdateOrders`, `deleteOrder`, `deleteOrders`
  - All use `useLiveQuery` from `dexie-react-hooks`
- **Verify:** `npx tsc --noEmit` → PASS

---

## Step 1.2: Build the Open Bucket Table Component ✅
- **Files:** `src/components/lyncis/bucket/order-table.tsx`
- **What changed:**
  - Shadcn Table with columns: Checkbox, Nama Penerima, Alamat Lengkap (truncated 40 chars), Tag, Items count, Total Harga (IDR format), Status badge, Actions
  - Status badges: "Bucket Baru" (secondary), "Siap Kirim" (yellow), "Selesai / Terkirim" (green outline)
  - Empty state: "Belum ada pesanan / Mulai dengan menambahkan data."
  - Select-all checkbox functionality
- **Verify:** `npx tsc --noEmit` → PASS

---

## Step 1.3: Build the Tag Sidebar Filter ✅
- **Files:** `src/components/lyncis/bucket/tag-sidebar.tsx`
- **What changed:**
  - "Semua Pesanan" at top (always visible, acts as "show all")
  - Active tags (≥1 unassigned) shown with green dot indicator + order count
  - Archived tags in collapsible "Riwayat" section
  - Uses ScrollArea for overflow
- **Verify:** `npx tsc --noEmit` → PASS

---

## Step 1.4: Build the Circular Pricing Logic Utility ✅
- **Files:** `src/lib/pricing.ts`
- **What changed:**
  - `updateUnitPrice`: sets isManualTotal=false, recalcs totalPrice
  - `updateTotalPrice`: sets isManualTotal=true, recalcs unitPrice
  - `updateQuantity`: branches on isManualTotal, Math.max(1, qty) guard
  - All functions are immutable (return new object)
- **Verify:** `npx tsc --noEmit` → PASS, browser verified: Qty=3 × UnitPrice=25000 → Total=75000 auto-calculated

---

## Step 1.5: Build the Order Edit Modal ✅
- **Files:** `src/components/lyncis/bucket/order-edit-dialog.tsx`
- **What changed:**
  - Dialog with 3 sections: Tag, Penerima (7 address fields), Barang (repeatable items)
  - Circular pricing wired: editing Harga Satuan updates Total, editing Total updates Satuan
  - Add/remove item buttons, min 1 item enforced
  - Tag autocomplete via datalist
- **Verify:** `npx tsc --noEmit` → PASS

---

## Step 1.6: Build the Order Create Dialog ✅
- **Files:** `src/components/lyncis/bucket/order-create-dialog.tsx`
- **What changed:**
  - Similar to edit dialog but pre-fills defaults (status: 'unassigned', logistics: zeros)
  - Tag required validation + at least 1 item validation
  - Sonner toast on success
  - Resets form on every open
- **Verify:** `npx tsc --noEmit` → PASS, browser verified: creates order + toast appears

---

## Step 1.7: Assemble the Open Bucket Page ✅
- **Files:** `src/app/page.tsx`
- **What changed:**
  - Layout: sidebar (tag filter) left + table right
  - Header with Lyncis branding + "Tambah Pesanan" button + order count
  - State wiring: selectedTag → useOrders filter, selectedIds → checkboxes, editingOrder → edit dialog
  - AlertDialog for delete confirmation (installed `alert-dialog` component)
  - Mobile responsive: sidebar collapses to Sheet
- **Verify:** `npm run build` → PASS, browser CRUD flow verified end-to-end

---
- Step 1: Refined sidebar aesthetics
  - Files: src/components/lyncis/bucket/tag-sidebar.tsx
  - Changes: Added horizontal padding, inset pill-style buttons, improved typography, and added smooth transitions.
  - Verification: Manual check of the UI for margins and spacing.
  - Result: PASS
- Step 2: Added collapse logic and toggle button
  - Files: src/app/page.tsx
  - Changes: Added isSidebarCollapsed state, a floating toggle button with Chevron animation, and smooth width transitions for the sidebar.
  - Verification: Manual check of the toggle functionality.
  - Result: PASS
- Step 3: Adjusted layout for expansion/contraction
  - Files: src/components/lyncis/bucket/order-table.tsx
  - Changes: Removed redundant borders to fit better in the new themed container.
  - Verification: Manual check of the layout consistency.
  - Result: PASS
- Step 4: Expand main content when collapsed
  - Files: src/app/page.tsx
  - Changes: Removed mx-auto and max-w-7xl constraints when isSidebarCollapsed is true.
  - Verification: Manual check of the table width when toggled.
  - Result: PASS
