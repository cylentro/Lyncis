# Smart Sorting Plan

## Goal
Implement sensible, state-aware sorting for orders.

## Steps
1. **Schema Update:** Add `updatedAt?: number` to the `JastipOrder` type in `src/lib/types.ts`.
2. **Database Hooks:** Update mutating hooks in `src/hooks/use-lyncis-db.ts` (`updateOrder`, `bulkUpdateOrders`, `commitBatch`, `markOrdersTriaged`, `autoSaveLogistics`, `autoSaveSenderId`, `stageOrders`, `unstageOrders`) to inject `updatedAt: Date.now()`.
3. **Smart Table Sorting:** In `src/components/lyncis/bucket/order-table.tsx`, sort the `filteredOrders` array before paginating based on the selected `statusFilter`:
   - `unassigned`, `staged`, `needs-review`: sort by `createdAt` ASC (oldest first).
   - `processed`: sort by `updatedAt` (fallback `createdAt`) DESC (newest updated first).
   - `all`: sort by `createdAt` DESC (newest created first).

## Verification
- Type check `npx tsc --noEmit`.
- Review sorting logic implementation.
