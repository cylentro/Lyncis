### Goal
Differentiate and optimize system prompts for Gemini and Gemma models to improve extraction accuracy and reduce token consumption.

### Assumptions
- Gemini supports native JSON mode, so its prompt can be more concise regarding formatting.
- Gemma requires stronger "no-chat" and "no-markdown" constraints.
- Token utilization is improved by removing excessive prose and using structured instruction formats.

### Plan
1. Define Model-Specific Prompts
   - Files: `src/lib/llm-parser.ts`
   - Change:
     - Replace the single `SYSTEM_PROMPT` with `GEMINI_PROMPT` and `GEMMA_PROMPT`.
     - `GEMINI_PROMPT`: Focus on schema logic and extraction rules. Leverage native JSON output capabilities.
     - `GEMMA_PROMPT`: Emphasize strict JSON output, provide a clear start/end boundary, and enforce no-markdown rules.
2. Optimize Token Use
   - Change:
     - Simplify rules into shorter, high-impact instructions.
     - Use a more compact JSON template.
     - Eliminate duplicative instruction in the `parseWithLLM` function.
3. Update `parseWithLLM` Runtime Logic
   - Change: Select the prompt strictly based on `AI_MODE`.
   - Verify: Run builds and check if AI extraction still works for both modes.

### Risks & mitigations
- **Risk:** Gemma might still add markdown if the prompt is too short.
- **Mitigation:** Maintain the explicit "Return ONLY raw JSON" instruction in the Gemma prompt.

### Rollback plan
- Revert to the previous version of `llm-parser.ts`.
