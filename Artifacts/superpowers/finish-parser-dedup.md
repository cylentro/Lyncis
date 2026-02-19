# Finish: Span-Based Deduplication & Inline Header Fix

## Verification Results
- `npx vitest run src/lib/__tests__/item-parser.test.ts` → **52 PASS**
- `npx vitest run src/lib/__tests__/scenarios.test.ts` → **7 PASS** (expanded from 6)
- `npx vitest run src/lib/__tests__/whatsapp-parser.test.ts` → **5 PASS**
- **Total: 64 PASS, 0 FAIL**
- `npx tsc --noEmit` → **0 errors**

## Changes Summary

### `src/lib/item-parser.ts`
1. **Pre-processing**: Added `INLINE_HEADER_STRIP` regex that normalizes `"Pesanan: N Item Price"` → `"N Item Price"` before any pattern runs.
2. **Consumed-line tracking**: Added a `consumedLines` Set and `claimLine`/`isConsumedLine` helpers. Every pattern loop now calls `claimLine` after a match. Lower-priority patterns (8, 9) skip lines already claimed.
3. **Pattern execution order**: Re-ordered to: P1 → P2 → P3 → P4 → P5 → **P7** → **P10** → **P6** → P8 → P9. This ensures `@`-price lines (P7/P10) and qty-first lines (P6) are claimed before the greedy P8/P9.
4. All pattern loops now run on `normalizedText` instead of `text`.

### `src/lib/whatsapp-parser.ts`
1. **Inline header cleanup pass**: Added a dedicated pass in the address cleanup step that strips `"Pesanan: "` etc. from line prefixes, then checks if the remainder is an item pattern. If so, removes the entire line — fixing S19-C where address was absorbing `"Pesanan: 3 Aqua 600ml 9000"`.

### `src/lib/__tests__/scenarios.test.ts`
1. S11 test now explicitly verifies **exactly 2 items** (not 4) with proper `qty` values.
2. S19 split into two tests: 19-A (with `x`) and 19-C (inline without `x`) — covering both patterns.

## Scenarios Fixed
| # | Issue | Status |
|---|-------|--------|
| S2 | countPotentialItems overcounting | ✅ Fixed |
| S3 | alamat leaking as item | ✅ Fixed |
| S9 | Aqua 600ml in bullet list | ✅ Fixed |
| S11 | 4 items → 2 items (dedup) | ✅ Fixed |
| S19-A | Pesanan: 1x inline | ✅ Fixed |
| S19-C | Pesanan: 3 Aqua inline | ✅ Fixed |

## Manual Validation
- Test pasting Scenario 11 input into the app → should see exactly 2 items.
- Test pasting Scenario 19 inputs → each order should have 1 item, address clean.
- Threshold in `.env.local` (`PARSER_REGEX_THRESHOLD=1`) means AI will always be tried as fallback.
