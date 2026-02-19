# Review: Excel Post-Import Verification

## Severity: Minor / Nit

### [Minor] DB Indexing
- **Issue**: I added `sourceFileName` to metadata but didn't update the Dexie index in `db.ts`.
- **Impact**: We cannot efficiently filter/sort by this field in the DB.
- **Mitigation**: For now, it's just a visual label. If we want a sidebar filter for "Recent Imports", we'll need a DB version bump.

### [Nit] Table Density
- **Issue**: Adding the source file name badge below the recipient name increases the row height slightly if the name is already long.
- **Impact**: Fewer rows visible per screen.
- **Recommendation**: Monitor feedback to see if it should be a separate (optional) column instead.

## Security
- No secrets logged.
- Metadata is stored locally in IndexedDB.

## Overall Status
**Ready for verification**. The flow is now much faster: Import -> Select All -> Bulk Confirm.
