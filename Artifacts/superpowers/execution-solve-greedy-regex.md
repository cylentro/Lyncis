# Execution: Solve Greedy Regex & Strict Thresholds

- Step 1 & 2: Fix Greedy Regex + Indonesian Slang (Shared)
- Status: In Progress...
- Step 3: Strictly Respect Threshold & Parity
- Files changed:
  - `src/lib/config-actions.ts`
  - `src/lib/excel-to-orders.ts`
  - `src/components/lyncis/intake/excel-upload.tsx`
  - `src/components/lyncis/intake/whatsapp-paste.tsx`
- Changes:
  - Exposed `PARSER_AI_THRESHOLD` to client-side.
  - Removed hardcoded `0.6` safety guards in both Excel and WhatsApp.
  - Implemented AI quality check using `PARSER_AI_THRESHOLD` to set `parseWarning`.
- Verification: `npx tsc --noEmit`
- Status: Completed.
