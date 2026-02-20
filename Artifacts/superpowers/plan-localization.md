# Plan: Application Localization (Bilingual ID/EN)

## Goal
Add English localization to the application, making it bilingual (Indonesian as default, English as secondary).
Store the user's language selection robustly so it persists across sessions.

## Constraints & Architecture
- The app is built with Next.js (App Router). To avoid hydration mismatches between Server and Client Components, **cookies** are the best place to store the language preference (Server can read cookies on initial render).
- We should use a lightweight, standard approach to dictionaries.

## Risks & Edge Cases
- **Hydration mismatch**: If we use `localStorage` and render translations on the server, the server will guess the language (likely default to `id`), and the client might read `en` from localStorage, causing text flashes or React hydration errors. Using cookies solves this.
- **Gradual rollout**: We have a lot of hardcoded Indonesian text across `src/components`. Migrating everything in one PR is too much risk. We should build the foundation, migrate the layout and a core component as proof-of-concept, and then gradually migrate others.
- **Date/Currency Formats**: Localization is not just text, but numbers/dates. We will need to ensure any utility functions dealing with dates and currencies format according to the active locale.

## Implementation Steps

### Phase 1: Core Localization Strategy & Foundation (Current PR)
1. **Define Dictionaries**: 
   - Create `src/i18n/dictionaries/id.ts` and `src/i18n/dictionaries/en.ts` with basic app shell texts (navigation, common buttons).
2. **Setup Server & Client Language Access**:
   - Create a helper `src/i18n/get-dictionary.ts` that will read the locale and return the correct dictionary.
   - Modify the root layout (`src/app/layout.tsx`) to read the `lyncis-locale` cookie (defaulting to `id`), pass it to a new React Context Provider (`LanguageProvider`).
   - Create the `LanguageProvider` (`src/components/providers/language-provider.tsx`) so Client Components can access the dictionary without prop-drilling.
3. **Language Switcher UI**:
   - Create a new component `src/components/lyncis/language-selector.tsx`.
   - It will update the `lyncis-locale` cookie (using something like `document.cookie`) and trigger a router refresh (`router.refresh()`) to fetch new translations from the server.
   - Inject the Language Switcher into the main Navigation/Sidebar or Header.

### Phase 2: Form/Table Migrations (Future / Iterative)
*(To be done in segments after the foundation acts smoothly)*
- Migrate the `order-table`, `order-form-content` and typical high-traffic UI components to use translations.
- For this plan, we'll migrate a few key visible components (like sidebar/header) as proof of correctness.

## Acceptance Criteria
- [ ] User can see a language toggle (ID / EN) in the UI.
- [ ] Toggling saves preference to a cookie.
- [ ] App immediately reflects the new language, persisting upon refresh.
- [ ] Default language is Indonesian if no cookie exists.

## Verification
- Clean build run: `npm run build`
- Run local server `npm run dev` and navigate the site, toggle languages, confirm the cookie `lyncis-locale` is set in browser DevTools.
- Verify no React hydration errors in browser console after toggle.
