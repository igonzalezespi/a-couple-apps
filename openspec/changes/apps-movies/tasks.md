## 1. Scaffold + foundation integration

- [ ] 1.1 Create `apps/movies` Expo app (`app.config.ts`, `package.json`, `tsconfig.json` extending `@aca/typescript-config/react-native.json`, `index.ts`/entry) consuming `@aca/{ui,core,i18n,config}`
- [ ] 1.2 Add `babel.config.js` with the Tamagui plugin + `metro.config.js` for the workspace; add the deferred `eslint-config-expo` layer to `@aca/eslint-config` and wire the app's `eslint.config.mjs`
- [ ] 1.3 Expo Router `app/_layout.tsx` mounts `UIProvider` + `I18nProvider` + `CoreProvider`; an index screen renders `@aca/ui` primitives with `@aca/i18n` strings
- [ ] 1.4 Component test (Vitest + RN-Web) that the index screen renders a localized string. Acceptance: `pnpm --filter movies typecheck`/`lint`/`test` green; `expo export -p web` builds

## 2. Auth gate

- [ ] 2.1 `createSupabaseClient` wired with AsyncStorage on native (via the options passthrough) + `EXPO_PUBLIC_*` env
- [ ] 2.2 Email-OTP sign-in screen + a session gate (unauthenticated → sign-in; authenticated → app) using `@aca/core` `useSession`
- [ ] 2.3 Test the gate (mocked session): signed-out shows sign-in, signed-in shows the app

## 3. TMDB search

- [ ] 3.1 `apps/movies/src/lib/tmdb.ts` — `fetch`-based search using `resolveExternalLang(language)` for `language=`
- [ ] 3.2 Search screen: query input → results list (`@aca/ui` + TanStack Query via `@aca/core`)
- [ ] 3.3 Test `tmdb.ts` with a mocked `fetch`: search passes the configured language; maps the response to a typed result

## 4. Movies schema + watchlist data

- [ ] 4.1 `supabase/migrations/0002_movies_schema.sql` — `movies.watchlist_items` (couple-scoped, watched flag) + RLS + realtime publication
- [ ] 4.2 `@aca/core`-based hooks in the app: list/add/remove/mark-watched watchlist items (zod contract for the row)
- [ ] 4.3 Test the hooks with a mocked Supabase client (add/remove/mark-watched call the right queries)

## 5. Watchlist UI

- [ ] 5.1 Watchlist screen: items with poster/title/watched toggle; add-from-search; remove
- [ ] 5.2 Component tests for the watchlist screen (render items, toggle watched, remove) with mocked data

## 6. Realtime sync

- [ ] 6.1 Subscribe via `subscribeCoupleChannel` (schema `movies`) on the watchlist screen; invalidate `['watchlist_items']` on change; unsubscribe on unmount
- [ ] 6.2 Test that a simulated realtime change invalidates the watchlist query

## 7. i18n + states

- [ ] 7.1 Route all user-facing strings through `@aca/i18n` (add movie keys to en/es); add a language switch
- [ ] 7.2 Loading / empty / error states for search + watchlist
- [ ] 7.3 Test a localized render + the language switch updates strings

## 8. End-to-end

- [ ] 8.1 Playwright web smoke (`e2e/movies.spec.ts`): sign-in (stub) → search → add → mark watched, against the exported RN-Web build
- [ ] 8.2 Maestro flow (`.maestro/movies-watchlist.yaml`) for the same journey (runs on a simulator; documented). Acceptance: `pnpm e2e` web smoke green; Maestro flow runnable locally

## 9. Validation & verification

- [ ] 9.1 `pnpm preflight` green; `pnpm --filter movies test` green; `expo export -p web` builds
- [ ] 9.2 `supabase db push` applies `0002_movies_schema.sql`; `movies` exposed in the API schemas
- [ ] 9.3 Manual device verification of the watchlist + realtime between two sessions (maintainer)

## Out of Scope

- **Plans app** — `apps/plans` ships as its own change (Phase 7). See design.md §Non-Goals.
- **Recommendations** — no personalized movie suggestions. See design.md §Non-Goals.
- **Offline support** — beyond Supabase realtime + the TanStack Query cache. See design.md §Non-Goals.
- **Native CI execution** — Maestro flows and native builds run on the maintainer's machine, not in CI/this sandbox. See design.md §Non-Goals.
