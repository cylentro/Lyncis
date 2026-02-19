### Goal
Uniform all tags in the autocomplete suggestions by showing all available tags from the database (including "General") across all intake methods, and removing the filter that only showed tags with active orders.

### Assumptions
- The user wants to see all tags they've ever used, not just those with current pending work.
- "General" is a standard tag that should always be selectable.
- Suggestions should be sorted alphabetically for better navigation.

### Plan
1. Update `UnifiedIntakePanel` Component
   - Files: `src/components/lyncis/intake/unified-intake-dialog.tsx`
   - Change:
     - Remove `unassigned > 0` filter from `activeTags` derivation.
     - Add "General" to the set of tags.
     - Sort results alphabetically.
     - Consolidate React imports (`useState`, `useMemo`, `useEffect`).
   - Verify: Check that all tags appear in the dropdown even if all their orders are "staged".

### Risks & mitigations
- **Risk:** Too many tags making the list long.
- **Mitigation:** `TagAutocomplete` already slices to the first 10 matches, and the popover has a max height with scrolling.

### Rollback plan
- Revert changes to `UnifiedIntakePanel.tsx`.
