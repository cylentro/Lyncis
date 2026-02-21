# Strict Environment-Driven AI Fallback logic

## Goal Description
Synchronize Excel and WhatsApp parsers to strictly respect `.env` thresholds. Fix greedy regex patterns and improve the item counter to recognize Indonesian price slang ("ribu", "rb", etc.), ensuring the "trigger" for AI fallback is robust.

## Proposed Changes

### 1. Robust Item Counting (Shared)
#### [MODIFY] `src/lib/item-parser.ts`
- **Fix Greediness**: Update line-matching regexes to be newline-strictly-limited (avoid `\s` which includes `\n`).
- **Indonesian Slang**: Update `itemContentMarkers` in `countPotentialItems` to include `\d+\s*(ribu|rb|rebu|jt|juta|k)\b`.
- **Verb Starters**: Add patterns for lines starting with "beli", "pesan", or "order" followed by a quantity.

### 2. Strictly respect PARSER_REGEX_THRESHOLD
#### [MODIFY] `src/lib/excel-to-orders.ts` & `src/components/lyncis/intake/whatsapp-paste.tsx`
- **Remove Hardcoded Guards**: Remove `&& currentConfidence < 0.6`.
- **The Trigger**: If (`currentConfidence < PARSER_REGEX_THRESHOLD` OR `hasMissingItems`) AND `hasPhoneNumber`, then trigger AI.
- Since your `.env` threshold is `1.0`, any result that isn't 100% perfect will now correctly trigger the AI.

### 3. Implement PARSER_AI_THRESHOLD (Quality Control)
#### [MODIFY] `src/lib/excel-to-orders.ts` & `src/components/lyncis/intake/whatsapp-paste.tsx`
- After AI data is merged into an order, recalculate its confidence using `getParsingConfidence(mergedOrder)`.
- If the resulting confidence is still `< PARSER_AI_THRESHOLD`, ensure the order is flagged with `parseWarning: true` so the user knows the AI was also unsure.

## Verification Plan

### Automated
- `npx tsc --noEmit`

### Manual
1. **"Ribu" Trigger Test**: Import/Paste the text "beli 2 ayam goreng satunya 10ribu". The item counter must now return `1`. Since regex mapping will fail to parse that slang, `hasMissingItems` will become true, triggering AI.
2. **Threshold Test**: With `PARSER_REGEX_THRESHOLD=1.0` and a native result of 0.85, verify AI IS called.
3. **AI Quality Test**: With `PARSER_AI_THRESHOLD=0.8`, if the AI also fails to find a location/name and the merged score is 0.7, verify the "Review" badge appears.
