## Why

App 1: a shared movie watchlist for the couple — the first end-user app. It validates the foundation end to end (the `ui`, `config`, `i18n`, and `core` packages) and the cross-platform target (iOS / Android / web from one codebase), and it proves the "adding an app is trivial" goal. Per the design, apps ship as their own OpenSpec changes; this is separate from `bootstrap-foundation`.

## What Changes

- Scaffold an Expo app at `apps/movies` (Expo Router, React Native Web) that consumes `@aca/ui`, `@aca/core`, `@aca/i18n`, and `@aca/config` — and ideally requires **no edits to the shared packages**.
- Land the foundation's deferred integration pieces, now that there is a real app: the `eslint-config-expo` layer, the Tamagui Babel/optimizing-compiler plugin, `expo-localization` (device locale → `resolveLanguage`), and AsyncStorage (Supabase auth persistence on native).
- Authenticate the couple (Supabase magic-link/OTP) and gate the app behind a session.
- Search movies via **TMDB in the configured language** (`@aca/i18n` `resolveExternalLang`).
- Add a Supabase **`movies` schema** (watchlist items) with RLS + realtime, separate from the `shared` schema.
- Implement the watchlist: search → add → mark watched → remove, **shared and realtime** between the two users, all through `@aca/core` hooks (never `@supabase/supabase-js` directly).
- Wire UI strings through `@aca/i18n` (en/es).
- Add a Maestro native flow + a Playwright web smoke for the primary journey.

## Capabilities

### New Capabilities

- `movie-watchlist`: authenticated, configured-language TMDB search; a shared, realtime-synced watchlist with watched state.

### Modified Capabilities

_(none — App 1 consumes the shared packages without changing their public APIs.)_

## Impact

- **New files**: `apps/movies/**`, `supabase/migrations/0002_movies_schema.sql`, `.maestro/movies-*.yaml`, `e2e/movies.spec.ts`.
- **Shared packages**: consumed unchanged. The only foundation edit expected is adding the deferred `eslint-config-expo` layer to `@aca/eslint-config` and a `react-native.json` `types: ["expo"]` consumer note.
- **New (app-scoped) deps**: `expo`, `expo-router`, `expo-localization`, `@react-native-async-storage/async-storage`, `react-native`, `react-native-web`, `@tamagui/babel-plugin`, `eslint-config-expo`. TMDB via `fetch` (no SDK).
- **Secrets**: `TMDB_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` — client-exposed values surface as `EXPO_PUBLIC_*`.
- **Backend**: a `movies` Postgres schema (watchlist) + RLS + realtime; the `shared` schema and auth come from `bootstrap-foundation`.
- **Environment limits**: iOS/Android builds and Maestro flows require a simulator/device and are run on the maintainer's machine; the **web (React Native Web) target is buildable/verifiable in CI and this environment**. Native steps are documented, not executed here.
- **Test coverage**: app component tests (Vitest + RN-Web), a web e2e smoke (Playwright), and a documented Maestro flow.
- **Rollback**: additive (new app + migration); `git revert` the commits and drop the `movies` schema.
- **Out of scope**: the plans app (Phase 7), recommendations, and offline support beyond Supabase realtime/cache.
