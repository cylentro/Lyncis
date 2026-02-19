### Goal
Standardize the item delete button design in manual/edit forms to match the WhatsApp extraction results.

### Assumptions
- The item card in `OrderFormContent` already has the `group` class.
- The user wants a "ghost" style button that only appears on hover.
- "Rounded square" means `rounded-md` or `rounded-lg`.

### Plan
1. Update Item Delete Button in `OrderFormContent`
   - Files: `src/components/lyncis/bucket/order-form-content.tsx`
   - Change:
     - Update its container to be inside the card (`top-3 right-3`).
     - Change opacity to `opacity-0 group-hover:opacity-100`.
     - Change the button to `variant="ghost"`, `rounded-lg`, and use destructive colors only on hover.
     - Add a smooth transition.
   - Verify: Open the manual add form or edit an existing order. Hover over an item card and ensure the delete button appears in the top-right corner inside the card.

### Risks & mitigations
- **Risk:** The delete button might overlap with the item name input.
- **Mitigation:** The item name label has a slight margin, and we can adjust the positioning if it feels cramped.

### Rollback plan
- Revert the CSS classes in `OrderFormContent.tsx`.
