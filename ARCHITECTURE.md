# Architecture

A Couple Apps is a pnpm + Turborepo monorepo of small cross-platform apps for one couple,
built on a shared foundation of packages. One Expo + React Native + React Native Web
codebase targets iOS, Android, and web. Development is spec-driven (OpenSpec).

See also: `ROADMAP.md` (phased plan), `openspec/` (specs + change proposals),
`docs/decisions/` (ADRs), and `README.md` (setup + the open-source-code / private-instance model).

## Principles

- **Open-source code, private per-couple instance.** The code is reusable (MIT); a running
  app belongs to one couple and talks to that couple's own Supabase project. There is no
  shared multi-tenant backend. "The couple" is every authenticated user of one instance, so
  Row Level Security scopes by `authenticated` with no tenant column.
- **One design system, identical everywhere.** All styling comes from `@aca/ui` (Tamagui
  tokens/themes). Apps never hard-code colors or spacing, so iOS, Android, and web match.
- **One data boundary.** Only `packages/core` imports `@supabase/supabase-js`. Apps use
  `@aca/core` hooks; a lint rule enforces the boundary.
- **Zero personal data in source.** Everything personal lives in `couple.config.ts`
  (neutral placeholders upstream); secrets live only in gitignored `.env` files.

## Package layout

```
apps/
  movies/            Expo app: shared movie watchlist (TMDB search, watchlist, realtime)
  (plans/)           Phase 7: shared plans/events (same pattern)
packages/
  ui/                Tamagui design system: tokens, themes, primitives. Presentation only.
  core/              The data boundary: Supabase client, auth, realtime, TanStack Query,
                     shared zod contracts. The only importer of @supabase/supabase-js.
  config/            zod schema + loader for couple.config.ts; env parsing + SENSITIVE_ENV_VARS.
  i18n/              en/es translations, language switching, resolveExternalLang() for TMDB.
  eslint-config/     shared flat ESLint config (base + expo + cross-package boundary rule).
  typescript-config/ shared strict tsconfig bases.
supabase/migrations/ SQL: schemas (shared + per-app), RLS, role grants, realtime publication.
openspec/            canonical specs + per-change proposals/design/tasks + lifecycle state.
```

**Dependency rule:** apps depend on packages; packages never depend on apps; there are no
cycles. Layering: `config` -> `i18n` / `core` / `ui` -> apps.

## Data flow

```
Screen (app)  ->  @aca/core hook (useQuery/useMutation)  ->  Supabase client (core)
                                                                |
                        zod contract validates the row  <-------+  (data boundary)
                                                                |
realtime: Postgres change -> supabase_realtime publication -> @aca/core channel
          -> invalidateForTable(queryClient, table) -> affected query refetches -> UI updates
```

- **Server cache:** TanStack Query (keys prefixed by table name so realtime can invalidate).
- **Local UI state:** Zustand (per app, as needed).
- **Auth:** passwordless email OTP via Supabase; `@aca/core` `useSession` gates the app.
- **External data language:** the configured app language drives TMDB requests via
  `resolveExternalLang` (en -> en-US, es -> es-ES).

## Backend (Supabase, one project per couple)

- `shared` schema (cross-app, e.g. `profiles`) + per-app schemas (`movies`, later `plans`).
- RLS: authenticated users (the couple) read/write the shared data; inserts are attributed
  to `auth.uid()`; the shared watchlist is editable by either partner (UPDATE granted only on
  the `watched` column so attribution cannot be overwritten).
- Realtime: tables are added to the `supabase_realtime` publication so both partners stay in
  sync without a manual refresh.
- Custom schemas are explicitly granted to `authenticated` and exposed in the Data API
  (PostgREST exposes only `public` by default).
- Optional `shared.allowed_emails` allowlist (fail-open until populated) restricts sign-ups.

## Testing

- **Unit/component:** Vitest + Testing Library (jsdom; a react-native -> react-native-web alias).
- **Web e2e:** Playwright, hermetic (Supabase + TMDB intercepted; no secrets).
- **Native e2e:** Maestro flows in `.maestro/`, run on a simulator/emulator.
- **Gate:** `pnpm preflight` (format:check -> lint -> typecheck -> test -> build); mirrored by
  a pre-push hook and, in CI, an aggregate `ci-gate`.

## Cross-platform notes

- `@aca/ui` primitives wrap Tamagui so a single component renders on web (React Native Web)
  and native. `onPress` maps to `onClick` on web; `accessibilityLabel` maps to `alt`/ARIA.
- Theme follows the OS appearance (`useColorScheme`); the token set ships light + dark.
