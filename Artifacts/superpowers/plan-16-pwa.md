# Plan: Step 4.4 PWA Setup & Favicon

## Objective
Configure Lyncis as a fully installable Progressive Web App (PWA) with offline capabilities, replacing the generic Next.js favicon with a branded one.

## Constraints & Context
- Framework is Next.js 16 (App Router) + Turbopack. Customization of Service Workers in this stack is best handled by `@serwist/next` (as `next-pwa` is stale).
- IndexedDB (Dexie) logic already exists; setting up standard service worker caching for JS/CSS/static will complete the "offline" goal.
- Favicon needs an SVG icon and `manifest.json` metadata (Theme color, standalone display, icons array).

## Steps
1. **Dependency Installation**
   - Install `@serwist/next` and `serwist`.
2. **Icons & Manifest Creation**
   - Create a sleek SVG app icon in `src/app/icon.svg` or `public/icon.svg`.
   - Remove generic `src/app/favicon.ico`.
   - Add `manifest.json` or dynamic `manifest.ts` in `src/app/manifest.ts`.
3. **PWA Configuration**
   - Implement `sw.ts` referencing Serwist's caching strategies.
   - Update `next.config.ts` to wrap export with `withSerwist()`.
4. **Metadata Updates**
   - Update `src/app/layout.tsx` to include theme colors and `apple-touch-icon`.
5. **Validation**
   - Make sure build passes without errors (`npm run build`).
   - Run dev/prod check to ensure service-worker registers properly.

## Acceptance Criteria
- App provides install prompt on supported browsers.
- New minimal branded icon is visible in tabs.
- Local static assets are aggressively cached for offline usage.
