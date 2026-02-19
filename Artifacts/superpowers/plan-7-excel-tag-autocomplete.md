### Goal
Fix the missing/broken tag autocomplete in the Excel intake view by replacing the plain input with the `TagAutocomplete` component and ensuring it works correctly.

### Assumptions
- The `ExcelUpload` component is currently using a standard `Input` instead of `TagAutocomplete`.
- The user expects the same autocomplete behavior as in the manual and WhatsApp intake modes.
- Multiple instances of `TagAutocomplete` might be present in the DOM, so unique IDs are preferred.

### Plan
1. Update `TagAutocomplete` Component
   - Files: `src/components/lyncis/intake/tag-autocomplete.tsx`
   - Change: Add an optional `id` prop to the component to avoid ID conflicts.
   - Verify: Component compiles and `id` is correctly applied to the `Input`.

2. Update `ExcelUpload` Component
   - Files: `src/components/lyncis/intake/excel-upload.tsx`
   - Change:
     - Import `TagAutocomplete`.
     - Replace the plain `Input` for `defaultTag` with `TagAutocomplete`.
     - Ensure `activeTags` are passed correctly.
   - Verify: Manual test of the Excel upload flow, checking if the tag field now has working autocomplete.

3. Update `WhatsAppPaste` Component (for consistency)
   - Files: `src/components/lyncis/intake/whatsapp-paste.tsx`
   - Change: Pass a unique `id` to its `TagAutocomplete` instance.
   - Verify: WhatsApp paste still works.

### Risks & mitigations
- **Risk:** Popover width issues in the Excel view (it might be smaller than the WhatsApp view).
- **Mitigation:** The `TagAutocomplete` already uses `PopoverAnchor` and `var(--radix-popover-anchor-width)`, which usually handles width matching well.

### Rollback plan
- Revert changes to `ExcelUpload.tsx` and `TagAutocomplete.tsx`.
