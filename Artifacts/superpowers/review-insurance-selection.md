# Review - Insurance Selection

## Blockers
- None.

## Majors
- None.

## Minors
- **AI Extraction Fallback**: If LLM fails to match categories perfectly, it might return empty or incorrect codes. Added generic toast, but users should verify AI results (as per design).

## Nits
- **Standardized Icon Sizes**: Small ShieldCheck icons are slightly varied in size between logistics input and summary.

## Summary
The insurance selection feature is fully implemented with:
1. Dynamic item-level declaration.
2. Manual AI "Fill with AI" trigger.
3. 0.2% fee calculation integrated into total costs.
4. Summary breakdown updated.
5. Persistent storage in Dexie via auto-save hooks.
