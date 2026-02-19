# Implementation Plan: UI Polish & Drawer Behavior (Revised)

## Phase 1: Global Styling
1. **Modify `src/app/globals.css`**:
   - Change `--radius` from `0.625rem` to `0.5rem`.
   - *Verification*: Visually check that components (buttons, cards, inputs) have slightly sharper corners.

## Phase 2: Drawer Content (OrderFormContent)
2. **Modify `src/components/lyncis/bucket/order-form-content.tsx`**:
   - Locate the item delete button container.
   - Remove classes that hide it (`opacity-0 group-hover:opacity-100`).
   - Add a solid background color to the trash button to ensure it's not transparent.
   - *Verification*: Open any order in Edit mode; the Trash icon should be visible on items without hovering and look professional.

## Phase 3: Drawer Behavior & Titles (OrderEditSheet)
3. **Modify `src/components/lyncis/bucket/order-edit-sheet.tsx`**:
   - Update `SheetTitle` logic:
     - `needsTriage` -> "Review Pesanan"
     - `readOnly` -> "Detail Pesanan"
     - default -> "Edit Pesanan"
     - (Note: Review takes priority over Detail as requested).
   - Add `onPointerDownOutside={(e) => { if (formData.metadata?.needsTriage || !readOnly) e.preventDefault(); }}` to `SheetContent`.
   - Update close button style to use `bg-muted/70` and match `UnifiedIntakePanel`.
   - Set `showCloseButton={false}` on `SheetContent`.
   - Update footer button styles to match the "Role Model" (premium look).
   - *Verification*: 
     - Open an order in "Review" or "Edit" mode. Click outside the drawer. It should NOT close.
     - Open an order in "Detail" mode (not triage). Click outside. It SHOULD close.
     - Titles should correctly reflect: Review Pesanan (for triage items), Detail Pesanan (for non-triage detail), Edit Pesanan (for editing).

## Phase 4: Final Review
4. **Review Pass**:
   - Use `/superpowers-review` to check for any inconsistencies.
