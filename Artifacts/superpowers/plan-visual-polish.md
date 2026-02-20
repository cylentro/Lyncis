# Plan: Phase 4 Visual Polish (Step 4.5)

## Objective
Finalize the visual polish items: adding empty state loading skeletons for the main table, spinners for parsing delays, standardizing weight formatting to `X.XX kg`, and wrapping the app in an Error Boundary.

## Steps
1. **Formatting Utilities**: Create `src/lib/formatters.ts` to centralize `formatCurrency` and `formatWeight` logic. Update `order-table.tsx` to use this centralized utility.
2. **Error Boundary**: Create an `ErrorBoundary` class component in `src/components/lyncis/shared/error-boundary.tsx` to gracefully catch and display react render errors without taking down the whole app. Include a "Try Again" fallback UI.
3. **Loading Skeletons**: 
   - Ensure the `Skeleton` component (`src/components/ui/skeleton.tsx`) is available.
   - In `order-table.tsx`, when `orders` is undefined (Dexie is still loading the data), display a `TableSkeleton` with staggered rows instead of a hard empty state.
4. **Spinner States**: Verify/add `Loader2` spinners to "Process" buttons in `whatsapp-paste.tsx` and `excel-upload.tsx` during their `isProcessing` states.
5. **Standardize Weights**: Apply `formatWeight` to all weight displays in the `BatchSummary` (step 4) and `LogisticsInput` (step 3) components.

## Verification
- Load the main page and verify skeletons appear briefly before table data paints.
- Test parsing functions (trigger WhatsApp or Excel) to ensure spinners show clearly during wait times.
- Verify weight strings in the Batch wizard read visually as `X.XX kg` consistently.
- Simulate an error by triggering an unhandled exception to ensure the `ErrorBoundary` gracefully catches it.
