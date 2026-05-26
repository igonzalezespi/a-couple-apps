# Architecture

A Couple Apps is a pnpm + Turborepo monorepo of small cross-platform apps for one couple,
built on a shared foundation of packages. One Expo + React Native + React Native Web
codebase targets iOS, Android, and web. Development is spec-driven (OpenSpec).

See also: `ROADMAP.md` (phased plan), `openspec/` (specs + change proposals),
`docs/decisions/` (ADRs), and `README.md` (setup + the open-source-code / private-instance model).

## Principles

- **Open-source code, private per-couple instance.** The code is reusable (MIT); a running
  app belongs to one couple and talks to that couple's own Supabase project. There is no
  shared multi-tenant backend, and no login: a build is private to one couple, so the app
  asks which of the two people you are (saved on-device). Row Level Security targets the
  `anon` role -- the couple's own keys are the boundary -- with no tenant column.
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
  core/              The data boundary: Supabase client, person selection, realtime, TanStack Query,
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
- **Identity:** no accounts. `@aca/core` `PersonProvider` stores which of the couple's two
  people you are (on-device); the app gates on that selection, not a session.
- **External data language:** the configured app language drives TMDB requests via
  `resolveExternalLang` (en -> en-US, es -> es-ES).

## Backend (Supabase, one project per couple)

- `shared` schema (cross-app data; no tables yet under the no-auth model) + per-app schemas
  (`movies`, later `plans`).
- RLS: the `anon` role read/writes the shared data (the couple's own keys are the boundary);
  inserts are attributed to the selected person id; the shared watchlist is editable by either
  partner (UPDATE granted only on the `watched` column so attribution cannot be overwritten).
- Realtime: tables are added to the `supabase_realtime` publication so both partners stay in
  sync without a manual refresh.
- Custom schemas are explicitly granted to `anon` and exposed in the Data API
  (PostgREST exposes only `public` by default).
- There is no sign-up surface to restrict: the boundary is the private build that ships the
  couple's anon key, not per-user accounts.

## Adding an app

A new app (e.g. `apps/plans`) composes the shared foundation; it never edits the shared
packages to add its own data shape or strings. The shared packages stay app-agnostic:
`@aca/core` carries only `BaseDatabase` (`public` + `shared`), and `@aca/i18n` carries only
the `common` namespace. An app owns the rest, through two seams.

**1. Typed Supabase schema -- compose `BaseDatabase`.** The app declares its own database type
and binds a hook so `client.schema(...)` is typed, without importing `@supabase/supabase-js`:

```ts
// apps/<app>/src/lib/database.ts
import { type BaseDatabase } from '@aca/core';

export type PlansDatabase = BaseDatabase & {
  plans: { Tables: { /* ... */ }; Views: ...; Functions: ...; Enums: ...; CompositeTypes: ... };
};

// apps/<app>/src/lib/use<App>Supabase.ts
import { useSupabase } from '@aca/core';
import { type PlansDatabase } from './database';

export const usePlansSupabase = () => useSupabase<PlansDatabase>();
```

`createSupabaseClient<DB>`, `AppSupabaseClient<DB>`, and `useSupabase<DB>()` are generic and
default to `BaseDatabase`, so untyped callers compile unchanged. Pass the app's type to keep
schema-qualified calls (`client.schema('plans')`) typed. Regenerate the schema block from the
real project with `supabase gen types typescript` once the tables grow. (Movies is the worked
example: `apps/movies/src/lib/database.ts` + `useMoviesSupabase.ts`.)

**2. App-owned i18n namespace -- register on the shared instance.** The app defines its own
namespace and binds a locale hook; shared shell strings (`common`) fall through automatically:

```ts
// apps/<app>/src/i18n/index.ts
import { createI18n, registerAppNamespace, useAppLocale } from '@aca/i18n';
import { en } from './en';
import { es } from './es';

export const createPlansI18n = (language) => {
  const instance = createI18n(language);          // common is defaultNS + fallbackNS
  registerAppNamespace(instance, 'plans', { en, es });
  return instance;
};

export const usePlansLocale = () => useAppLocale('plans'); // resolves plans, falls back to common
```

`useAppLocale(ns)` returns `{ t, language, languages, setLanguage }`; `language`/`setLanguage`
are namespace-independent. Because `common` is the `fallbackNS`, a component mixing app and
shell strings needs only the one app hook. Guard each locale with a per-namespace key type
(`Record<<App>TranslationKey, string>` for `es`), mirroring `CommonTranslationKey` (in `@aca/i18n`)
and `MoviesTranslationKey` (in `apps/movies`).

**The rule:** shared packages hold cross-app shape only. Adding an app touches `apps/<app>/`
(and its Supabase migration), never `@aca/core` or `@aca/i18n` internals -- which is exactly the
Phase 7 acceptance criterion ("adding the app required no edits to shared package internals").

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
