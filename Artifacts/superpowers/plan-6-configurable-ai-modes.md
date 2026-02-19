### Goal
Enable configurable AI modes (Gemini vs Gemma) via environment variables to handle differences in JSON mode support, and rename model variable to a more generic `LLM_MODEL`.

### Assumptions
- `AI_MODE` will be used to toggle between `gemini` and `gemma`.
- `LLM_MODEL` will replace `GEMINI_MODEL` to specify the model version.
- Gemma models do not support `responseMimeType: 'application/json'`.

### Plan
1. Update Environment Variables
   - Files: `.env.local`
   - Change: 
     - Rename `GEMINI_MODEL` to `LLM_MODEL`.
     - Add `AI_MODE=gemini`.
     - Add comments for Gemma configuration examples.
   - Verify: Check if variables are correctly set in the file.

2. Implement Configurable LLM Logic
   - Files: `src/lib/llm-parser.ts`
   - Change:
     - Update variable names (e.g., `GEMINI_MODEL` -> `LLM_MODEL`).
     - Read `AI_MODE` from env.
     - Conditionally omit `responseMimeType` if mode is `gemma`.
     - Add `cleanJsonString` helper to handle markdown-wrapped JSON from Gemma.
     - Update prompt for Gemma to be more explicit about JSON structure if needed.
   - Verify: Run existing tests or manual verification with both modes.

3. Verify Gemma Mode (Manual)
   - Files: `.env.local`
   - Change: Temporarily set `AI_MODE=gemma` and `LLM_MODEL=models/gemma-3-12b-it`.
   - Verify: Attempt to parse a WhatsApp message and ensure it doesn't throw the 400 Bad Request error.

### Risks & mitigations
- **Risk:** Breaking changes for existing deployments if they rely on `GEMINI_MODEL`.
- **Mitigation:** Allow a fallback in the code to read `GEMINI_MODEL` if `LLM_MODEL` is not found, or clearly document the migration.

### Rollback plan
- Revert changes to `src/lib/llm-parser.ts` and set `.env.local` back to using `GEMINI_MODEL`.
