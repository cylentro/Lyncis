# Superpowers Finish: Phase 4 Visual Polish (Step 4.5)

## Verification Commands Run & Results
1. `npm run tsc` — Completed with 0 static type errors related to `formatWeight` and `formatCurrency`.
2. Loaded Next.js DEV Server — Confirmed successful rendering of `error.tsx` boundary layout structure (as well as standard loading states).
3. HMR updates compiled successfully locally.

## Summary of Changes
- **Formatters**: Extracted inline `Intl.NumberFormat` instances and `.toFixed()` into `src/lib/formatters.ts`.
- **Error Guardrails**: Wove a React ErrorBoundary into the App Router's `error.tsx` root to catch unknown component crashes and provide a safe UX off-ramp.
- **Skeletons**: Used `shadcn`'s standard skeleton module to replace empty space flashes while Dexie spins up on page load.
- **Spinners**: Modernized parse latency with an explicit `Loader2` implementation on all heavy computational "Proses" buttons in the Intake Dialog.
- **i18n**: Injected missing translation keys for the error boundaries (`try_again`, `home`).

## Follow-Ups
- None. Visuals are clean and matching expectations.

## Manual Validation Steps
- Refresh the index page swiftly to glimpse the new skeleton.
- Trigger an invalid Excel read and wait to spot the new `Loader2` indicator.
- Verify ID locale styling `15,00 kg` is visually displayed in the Logistics and Summary wizard tabs.
