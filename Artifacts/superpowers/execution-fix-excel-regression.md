# Execution: Fix Excel AI Fallback & Synchronization

- Step 1: Remove Placeholder items + Sync Fallback Logic
- Status: In Progress...
- Step 1: Remove Placeholder items + Sync Fallback Logic
- Files changed:
  - `src/lib/excel-to-orders.ts`
- Changes:
  - Deleted the fallback creation of "Barang Impor" placeholder item.
  - Updated `countPotentialItems` context to use all row cell values.
  - Synchronized `needsAiFallback` condition with WhatsApp implementation.
- Verification: `npx tsc --noEmit` (Clean except for .next cache artifacts).
- Status: Completed.
- Step 2: Refine Confidence Scoring
- Files changed:
  - `src/lib/item-parser.ts`
- Changes:
  - Updated `getParsingConfidence` to exclude placeholder names (e.g., "Tanpa Nama", "Penerima Impor", "Barang Impor") from contributing to the confidence score.
- Verification: `npx tsc --noEmit`
- Status: Completed.
