## Context

The foundation (`bootstrap-foundation`) provides the monorepo, the design system (`@aca/ui`), the config + secrets system (`@aca/config`), i18n (`@aca/i18n`), and the data boundary (`@aca/core`: Supabase client, auth, realtime, TanStack Query). App 1 is the first consumer and the proof that adding an app is dropping a folder under `apps/*` and wiring the shared packages.

This is also where the foundation's deferred app-integration pieces land: `eslint-config-expo`, the Tamagui Babel plugin, `expo-localization`, and AsyncStorage-backed auth persistence.

Constraints: cross-platform (iOS/Android/web) from one codebase; UI only via `@aca/ui`; data only via `@aca/core`; configured language drives TMDB; secrets in `.env`/`EXPO_PUBLIC_*`.

## Goals / Non-Goals

**Goals:**

- A runnable Expo app (web verifiable here; native on the maintainer's machine) that authenticates the couple and shows a shared, realtime movie watchlist.
- TMDB search in the configured language; add/remove/mark-watched persisted to Supabase and synced live between both users.
- Prove adding an app needs no shared-package edits (beyond landing the deferred `eslint-config-expo` layer).

**Non-Goals:**

- **Plans app** — `apps/plans` ships as its own change (Phase 7).
- **Recommendations** — no personalized movie suggestions.
- **Offline support** — beyond what Supabase realtime + the TanStack Query cache give for free.
- **Native CI execution** — Maestro flows and native builds run on the maintainer's machine, not in this sandbox/CI.

## Decisions

### D1: Expo Router app structure
`apps/movies/app/` holds file-based routes: `_layout.tsx` (mounts `UIProvider` + `I18nProvider` + `CoreProvider`), an auth gate, and `(tabs)`/screens for the watchlist. **Why**: Expo Router is the standard, works across native + web, and matches the foundation's choice.

### D2: TMDB client lives in the app, not `@aca/core`
A small `apps/movies/src/lib/tmdb.ts` wraps `fetch` with `resolveExternalLang(language)`. **Why**: TMDB is movie-specific; `@aca/core` is the generic Supabase/data boundary. If a second app ever needs TMDB, promote it then. **Alternative considered**: put it in core — rejected (pollutes the shared boundary with app-specific concerns).

### D3: `movies` Postgres schema, separate from `shared`
`supabase/migrations/0002_movies_schema.sql` creates `movies.watchlist_items` (couple-scoped, FK to the couple/profile), RLS so only the couple can read/write, and adds it to the realtime publication. **Why**: per the design's per-app-schema model; keeps app data isolated.

### D4: Auth via Supabase magic-link/OTP
Email OTP (passwordless) keeps it simple for two users; session persisted via AsyncStorage on native (passed to `createSupabaseClient` options) and localStorage on web. **Why**: lowest-friction auth for a private two-person app.

### D5: Realtime through `@aca/core`
The watchlist screen subscribes via `subscribeCoupleChannel` (schema `movies`); changes invalidate the `['watchlist_items']` query. **Why**: reuses the foundation's realtime→cache plumbing so both users stay in sync without a refresh.

### D6: e2e — Playwright (web) here, Maestro (native) on device
Playwright drives the exported RN-Web build for the search→add→watched journey (runs in CI/this env). A Maestro flow covers the same journey on a simulator (run by the maintainer). **Why**: matches the foundation's e2e split and the environment limits.

## Risks / Trade-offs

- **[Expo + Tamagui Babel + Metro + RN-Web integration is finicky]** → Mitigation: scaffold-first slice that just renders an `@aca/ui` screen and builds for web before adding features; pin to the Expo SDK that matches the installed React 19 / RN 0.82.
- **[Native un-verifiable in this sandbox]** → Mitigation: deliver and verify the web target here; document native run steps; Maestro flow authored but executed by the maintainer.
- **[TMDB rate limits / key exposure]** → Mitigation: client key is a TMDB v3 read key (low-risk); cache via TanStack Query; `EXPO_PUBLIC_TMDB_API_KEY`.
- **[Supabase multi-schema exposure]** → Mitigation: ensure `movies` is in the API `schemas` list (documented in `supabase/README.md`).

## Migration Plan (implementation slices)

1. **Scaffold** — `apps/movies` Expo app + Expo Router + Tamagui Babel + `eslint-config-expo`; renders an `@aca/ui` screen using `@aca/i18n` strings; web build green.
2. **Auth** — OTP sign-in gate; `createSupabaseClient` with AsyncStorage; `useSession`.
3. **TMDB search** — `tmdb.ts` + a search screen (configured language).
4. **Watchlist data** — `movies` schema migration + `@aca/core` query/mutation hooks (add/remove/mark-watched).
5. **Realtime** — `subscribeCoupleChannel` → cache invalidation.
6. **i18n + polish** — all strings via `@aca/i18n`; empty/loading/error states.
7. **e2e** — Playwright web smoke + Maestro native flow.

Each slice is its own commit, verified (web) before the next.

## Open Questions

- **Expo SDK version** vs the already-installed React 19.2 / RN 0.82 — confirm the matching Expo SDK at scaffold time (Expo SDK 54+).
- **One QueryClient/Supabase client instance** shared by both apps, or per-app? Proposal: per-app (each app creates its own at root). Confirm.
- **TMDB image CDN** base URL config — hardcode the standard `image.tmdb.org` base or make it configurable. Proposal: constant with a sane default.
