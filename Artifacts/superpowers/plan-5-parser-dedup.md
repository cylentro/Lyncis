# Plan: Span-Based Deduplication & Inline Header Fix

## Goal
Fix 4 remaining failing scenarios:
- **S2**: `countPotentialItems` overcounts (3 detected when only 2 items).
- **S3**: Parser finds 4 items (should be 2); `alamat taman ...` is still leaking as an item.
- **S11**: 4 items registered instead of 2 due to Pattern 6 AND Pattern 8 both matching the same line.  
- **S19 Order C**: `Pesanan: 3 Aqua 600ml 9000` inline (no x) leaks into address.

## Root Causes
1. **S11**: `"Indomie Goreng Rendang 3 9000"` matches Pattern 6 as `qty=3, name="Indomie Goreng Rendang"` AND Pattern 8 as `name="Indomie Goreng Rendang 3", qty=1`. Different names → dedup doesn't catch it.
2. **S19-C**: Pattern 6 regex starts with `(\d+)` so `"Pesanan: 3 Aqua 600ml 9000"` doesn't match (has prefix). Pattern 1 already handles `Pesanan: Nx ...` but requires the `x` syntax.
3. **S3**: `"alamat taman duren sawit 13440"` — `13440` is being parsed as a price by Pattern 9. The anti-leakage in Pattern 9 only checks if name starts with "alamat" but the full line includes "alamat".

## Steps

### Step 1: Pre-process text to strip "Pesanan:" and similar inline headers
- Before running any patterns in `extractItems`, normalize lines like `"Pesanan: 3 Aqua 600ml 9000"` → `"3 Aqua 600ml 9000"` by stripping the header prefix.
- This ensures Pattern 6 can then match the numeric qty that follows.

### Step 2: Implement consumed-line tracking in `extractItems`
- After each pattern match, record which **line** (identified by its start index or line content) was consumed.
- Before adding an item in a lower-priority pattern (8, 9), check if that line was already consumed.
- Patterns run in priority order: 1 → 2 → 3 → 4 → 5 → 7 → 6 → 8 → 9 → 10.
- Patterns 8 and 9 are the most greedy, so they must skip already-claimed lines.

### Step 3: Refine Pattern 9 anti-leakage for "alamat" unlabeled addresses
- In Pattern 9, detect if the matched line starts with an "alamat"-like keyword (even without colon).
- Already handled in `isContactLine`? Check.

### Step 4: Update regression tests  
- Add S11 test: ensure exactly 2 items, check for no duplicates.
- Add S19-C test: ensure "Pesanan: 3 Aqua 600ml 9000" inline correctly parsed.
- Update S2 and S3 tests to match expectations.

## Verification
- `npx vitest run src/lib/__tests__/scenarios.test.ts` → all 6+ PASS
- `npx vitest run src/lib/__tests__/item-parser.test.ts` → 52 PASS
- `npx tsc --noEmit` → 0 errors
