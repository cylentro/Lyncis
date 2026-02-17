# Plan: Focus Mode for WhatsApp Paste Editing

## Objective
Enhance the "Edit Mode" in the WhatsApp Paste component to provide a distraction-free experience. When a user edits a parsed order, all unrelated UI elements (tabs, raw text input, process buttons, headers) should be hidden.

## Constraints
- Must not break existing functionality.
- "Edit Mode" is defined as when `editingIndex` is not null in `WhatsAppPaste`.
- Must communicate state up to `UnifiedIntakePanel` to hide the parent Tabs.

## Changes

### 1. `src/components/lyncis/intake/whatsapp-paste.tsx`
- **Props Update**: Add `onEditingChange?: (isEditing: boolean) => void`.
- **State Logic**: 
    - Use `useEffect` to trigger `onEditingChange` whenever `editingIndex` changes.
- **Render Logic**:
    - Wrap the "Raw Text" input and "Proses Teks" button in a condition: `!isEditing`.
    - Wrap the "Preview Hasil Ekstraksi" header and "Reset" button in a condition: `!isEditing`.
    - Ensure `ScrollArea` takes appropriate height/style in edit mode.

### 2. `src/components/lyncis/intake/unified-intake-dialog.tsx`
- **State**: Add `isWhatsappEditing` state.
- **Render Logic**:
    - Pass `onEditingChange={setIsWhatsappEditing}` to `WhatsAppPaste`.
    - Conditionally hide the `TabsList` container when `isWhatsappEditing` is true.

## Verification
1.  Open Project.
2.  Open "Tambah Pesanan" dialog.
3.  Go to "WhatsApp" tab.
4.  Paste some text and click "Proses Teks".
    ```
    Nama: Budi
    HP: 08123456789
    Alamat: Jl. Sudirman
    Pesanan: 1x Barang A
    ```
5.  Click the "Pencil" icon on the result card.
6.  **Verify**:
    - "Raw Text" input is GONE.
    - "Proses Teks" button is GONE.
    - "Preview Hasil Ekstraksi" header and "Reset" buttons are GONE.
    - Top Tabs (Manual, Excel, WhatsApp) are GONE.
    - The active card is expanded in edit mode.
7.  Click "Batal" or "Update Pesanan".
8.  **Verify**: All hidden elements reappear.

## Step-by-Step Implementation
1.  Update `whatsapp-paste.tsx` to handle `onEditingChange` and hide local elements.
2.  Update `unified-intake-dialog.tsx` to manage state and hide tabs.
