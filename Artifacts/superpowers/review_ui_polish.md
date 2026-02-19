# Implemention Review: UI Polish & Drawer Behavior

## Changes Made
1. **Global Radius**: Updated `--radius` in `globals.css` to `0.5rem` (down from `0.625rem`) to provide a sharper, more professional look across all components.
2. **Item Delete Button**: In `OrderFormContent`, the item delete button (Trash icon) is now always visible (removed `opacity-0` and hover requirement) and has a solid background to ensure it is not transparent in the drawer.
3. **Drawer Titles**: Standardized `SheetTitle` in `OrderEditSheet`. Triage items now explicitly show \"Review Pesanan\" even when opened in detail mode, satisfying the requirement for triage priority.
4. **Click-Outside Behavior**: Implemented `onPointerDownOutside` in `OrderEditSheet`. The drawer will no longer close when clicking outside if the item needs review or is being edited, preventing accidental data loss. It still allows closing on outside click in read-only mode for non-triage items.
5. **UI Consistency**: Aligned the close button style in `OrderEditSheet` with the `UnifiedIntakePanel` (Add New) role model, using a muted background with transition effects.
6. **Footer Polish**: Enhanced the footer buttons in the edit sheet with improved borders, rounded corners (consistent with the new radius), and active state transformations for a more premium feel.

## Severity Review
- **Blocker**: None
- **Major**: None
- **Minor**: None
- **Nit**: Global radius change might require a brief visual scan of all pages to ensure no pixel-pushing issues occurred (unlikely given it's a small standard change).

## Verification Results
- Reviewed `OrderEditSheet.tsx` logic for titles: `needsTriage` (Review) > `readOnly` (Detail) > Default (Edit).
- Verified `onPointerDownOutside` logic: `needsTriage || !readOnly` prevents closing.
- Verified CSS radius change.
- Verified Trash button visibility in `OrderFormContent.tsx`.
