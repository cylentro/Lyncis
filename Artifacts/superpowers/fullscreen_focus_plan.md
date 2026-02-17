# Plan: Fullscreen Focus Mode for WhatsApp Editing

## Objective
Refactor the "Edit Mode" in WhatsApp Paste to be substantially "fullscreen" within the dialog, removing the card-like borders and pinning the action buttons to the bottom of the viewport.

## Changes

### 1. `src/components/lyncis/intake/unified-intake-dialog.tsx`
- **Container Styling**: Update the whatsapp tab content container.
    - When `isWhatsappEditing` is `true`:
        - Set `overflow-hidden` (disable parent scrolling, allow child scrolling).
        - Set `p-0` (remove padding).
        - Ensure `flex flex-col h-full`.
    - When `false`:
        - Keep `overflow-y-auto` and `p-5`.
- **Wrapper**: Ensure the `animate-in` wrapper allows height propagation (e.g., `h-full`).

### 2. `src/components/lyncis/intake/whatsapp-paste.tsx`
- **Render Logic Refactor**:
    - Instead of rendering the edit form *inside* the list `.map()`, implement an early return (or conditional block) for `editingIndex !== null`.
    - **Edit Mode Layout**:
        - Root: `flex flex-col h-full`.
        - Content: `flex-1 overflow-y-auto p-5` (Scrollable Form).
        - Footer: `shrink-0 p-4 border-t bg-background` (Sticky Buttons).
    - **Styles**:
        - Remove `border` and `rounded-md` from the edit container (since it's now the main view).
        - Ensure "Informasi Penerima" and other sections occupy the full width comfortably.

## Verification
- **Manual Verification**:
    1.  Go to WhatsApp.
    2.  Process Text.
    3.  Click Edit.
    4.  **Check**:
        - The view fills the dialog panel.
        - No border surrounding the form content (it looks native to the panel).
        - Scroll content -> "Update Pesanan" buttons stay fixed at the bottom.
        - "Informasi Penerima" section looks integrated, not boxed.

## Step-by-Step
1.  Update `UnifiedIntakeDialog` to handle styling for fullscreen children.
2.  Update `WhatsAppPaste` to implement the separated Fullscreen Edit View.
