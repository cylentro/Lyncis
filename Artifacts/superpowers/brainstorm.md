# Superpowers Brainstorm: Adhering to Database Names

## Goal
Ensure the location matcher returns the exact strings from the `location.json` database, even when matching against variants in parentheses. Specifically for Jakarta Selatan (and others), we should not return a "shortened" or "cleaned" version of the name if the user provided an alias.

## Constraints
- Return the full `subdistrict_name`, `district_name`, etc., as they appear in the JSON.
- Maintain the "smart" matching that allows aliases like "setiabudi" to find the "Setia Budi (Setiabudi)" record.

## Known context
- Currently, I added `findBestDisplayName` which returns the specific variant matched.
- The user's feedback "we should stick to the data that we have" indicates they prefer the canonical database strings.

## Risks
- The full strings might be long/verbose (e.g., "Setia Budi (Setiabudi)"), but if that's what the data has, that's what we should use.

## Options (2–4)
1. **Remove Variant Return Logic**: Keep the enhanced variant-aware scoring, but remove the `findBestDisplayName` helper and just return the original field from the database.
2. **Prioritize Primary Name**: If a variant matches, return the primary name (the part before the parentheses) instead of the full string. (Contradicts "stick to data").
3. **Keep Enhanced Scoring Only**: Ensure that if "Setiabudi" is typed, the score for "Setia Budi (Setiabudi)" is high enough to be selected, but the output remains the full string.

## Recommendation
**Option 1**: Revert the return value logic to use the original database strings, while keeping the improved regex and variant-aware scoring so that the matches are still found correctly.

## Acceptance criteria
- Input "kelurahan setiabudi" -> `kelurahan: "Setia Budi (Setiabudi)"`
- Input "kelurahan setia budi" -> `kelurahan: "Setia Budi (Setiabudi)"` (if Jakarta is prioritized) or the exact match.
