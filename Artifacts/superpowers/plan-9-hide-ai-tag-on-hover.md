### Goal
Hide the "AI" tag and index number in the WhatsApp extraction results when the user hovers over the card, ensuring they don't overlap with the edit/delete buttons.

### Assumptions
- The card has the `group` class.
- The edit/delete buttons appear on hover using `group-hover:opacity-100`.
- The user wants a clean transition where metadata in the top-right corner is replaced by action buttons.

### Plan
1. Update WhatsApp Results Styling
   - Files: `src/components/lyncis/intake/whatsapp-paste.tsx`
   - Change:
     - Apply `group-hover:opacity-0 transition-all duration-200` to the container of the "AI" badge and index number.
     - Remove the individual `group-hover:opacity-0` from the index number to keep it consistent within the container.
   - Verify: Hover over an AI-extracted order in the WhatsApp results and ensure the "AI" badge and sequence number are smoothly replaced by the Edit and Delete icons.

### Risks & mitigations
- **Risk:** The action icons might slightly jitter if the container size changes.
- **Mitigation:** The action icons are `absolute`, so the layout shouldn't shift.

### Rollback plan
- Revert the CSS classes in `whatsapp-paste.tsx`.
