### Goal
Optimize LLM prompts for different models (Gemini vs Gemma) and ensure location fields are strictly blanked out if not resolved by the internal location table.

### Assumptions
- Gemini mode uses native JSON mode; Gemma mode uses markdown cleaning.
- "Look up to location table" means using the `matchLocation` utility as the primary source of truth for structural fields.
- If the resolved confidence is low, structural fields should be empty, even if the LLM provided guesses.

### Plan
1. Refine LLM Prompts
   - Files: `src/lib/llm-parser.ts`
   - Change:
     - Create model-specific instructions.
     - Add explicit rules for locations: "Do not guess structural fields; keep them blank unless explicitly found in text."
     - Prompt Gemini to use JSON mode internal logic and Gemma to avoid any chatty responses.
2. Update Location Logic in `parseWithLLM`
   - Files: `src/lib/llm-parser.ts`
   - Change:
     - Initialize `locationData` with empty values.
     - If `matchLocation` fails (null or low confidence), ensure fields remain blank, overwriting any LLM hallucinations.
   - Verify: Test with a snippet that has a vague address; ensure structural fields come back empty.

### Risks & mitigations
- **Risk:** LLM might still halluncinate despite instructions.
- **Mitigation:** The post-processing logic in `parseWithLLM` will strictly overwrite these fields with blanks if the lookup fails.

### Rollback plan
- Revert changes to `llm-parser.ts`.
