# Fix: Android UUID Compatibility

## Problem
In older Android browsers and some WebView versions, `crypto.randomUUID()` is not defined, causing the application to crash during parsing or item addition with the error: `crypto.randomuuid is not a function`.

## Solution
Replaced all occurrences of `crypto.randomUUID()` across the codebase with `uuidv4()` from the `uuid` package, which provides a fallback for environments without the native `crypto` API.

## Affected Files
- `src/lib/item-parser.ts`
- `src/lib/llm-parser.ts`
- `src/components/lyncis/intake/whatsapp-paste.tsx`
- `src/components/lyncis/fulfillment/batch-wizard.tsx`

## Verification
- Verified that all `crypto.randomUUID` calls are removed via `grep`.
- Successfully ran `npm run build` to ensure no regressions in server or client bundles.
