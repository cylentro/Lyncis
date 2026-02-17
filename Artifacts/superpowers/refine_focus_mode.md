# Plan: Refine Focus Mode (Remove Whitespace & Separators)

## Objective
Remove the excess whitespace and the separator line ("vertical bar" / horizontal border) that appears when in WhatsApp Edit Mode.

## Analysis
Based on the screenshot and code:
1.  **Whitespace & Line**: `WhatsAppPaste` has a wrapper `<div className="space-y-4 pt-4 border-t mt-4 ...">`. This adds a top border and significant spacing.
2.  **Container Padding**: `UnifiedIntakeDialog` has `<div className="flex-1 overflow-y-auto p-5">`. This adds 20px padding around the content.
3.  **Vertical Bar**: The user might be referring to the browser/OS scrollbar or the `border-t`. I'll address the structural spacing and borders first. If "vertical bar" refers to the scrollbar, I will try to keep it native but maybe the padding removal helps it look less "floating".

## Changes

### 1. `src/components/lyncis/intake/whatsapp-paste.tsx`
- Conditionally apply `pt-4 border-t mt-4` only when `editingIndex === null`.
- When editing, we want the form to be flush or have minimal top spacing.

### 2. `src/components/lyncis/intake/unified-intake-dialog.tsx`
- Conditional padding: Change `p-5` to `p-0` (or `p-2`) when `isWhatsappEditing` is true.

## Verification
1.  Open WhatsApp tab.
2.  Process text.
3.  Click Edit.
4.  **Confirm**:
    - The faint line above the card is gone.
    - The large gap above the card is reduced.
    - The content extends closer to the edges (if `p-0` is used).

## Step-by-Step
1.  Update `whatsapp-paste.tsx` to handle conditional classes for the wrapper.
2.  Update `unified-intake-dialog.tsx` to handle conditional padding.
