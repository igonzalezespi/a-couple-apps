# A Couple Apps — AI Context

Concise project brief for an AI agent. For detail, see `CLAUDE.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `README.md`.

## What it is

Open-source monorepo of small cross-platform apps for **one couple** (e.g. a shared movie
watchlist; later shared plans/events). One Expo + React Native + React Native Web codebase
targets **iOS, Android, and web**. Development is **spec-driven** (OpenSpec) and AI-assisted.

**Model:** open-source code (MIT), private per-couple instance. Each running app talks to that
couple's own Supabase project. No multi-tenant backend, **no login** — the build is private to a
couple, so the app just asks which of the two people you are (saved on-device). RLS targets the
`anon` role; the couple's own keys are the boundary.

## Tech stack

- **Monorepo:** pnpm workspaces + Turborepo · Node >= 24 · TypeScript (strict) · ESM.
- **Runtime:** Expo + React Native + React Native Web · Expo Router.
- **UI:** Tamagui design system (`packages/ui`) — tokens/themes, light+dark, OS appearance.
- **State:** TanStack Query (server cache; keys prefixed by table name) + Zustand (local UI).
- **Backend:** Supabase (one project per couple) — Postgres + RLS + Realtime.
- **i18n:** i18next + react-i18next + expo-localization (en/es). Language also drives external
  data (TMDB) via `resolveExternalLang`.
- **Test:** Vitest + Testing Library (jsdom, react-native→react-native-web alias) · Playwright
  (web e2e, hermetic) · Maestro (native e2e, `.maestro/`).
- **Quality:** ESLint (flat) + typescript-eslint + eslint-config-expo · Prettier · Husky +
  lint-staged · Conventional Commits (commitlint) · syncpack.

## Layout

```
apps/
  movies/            Expo app: shared movie watchlist (TMDB search, watchlist, realtime)
packages/
  ui/                Tamagui design system (presentation only)
  core/              Data boundary: ONLY importer of @supabase/supabase-js; hooks,
                     PersonProvider, realtime, zod contracts, BaseDatabase
  config/            zod schema + loader for couple.config.ts; env parsing
  i18n/              en/es translations, language switching, resolveExternalLang (TMDB)
  eslint-config/     shared flat config + cross-package boundary rule
  typescript-config/ shared strict tsconfig bases
supabase/migrations/ SQL: schemas (shared + per-app), RLS, grants, realtime publication
openspec/            canonical specs + per-change proposals/design/tasks + lifecycle state
scripts/opsx/        zero-dependency OpenSpec workflow scripts + linters
docs/decisions/      ADRs (MADR)
```

**Dependency rule:** apps depend on packages; packages never depend on apps; no cycles.
Layering: `config` → `i18n`/`core`/`ui` → apps.

## Data flow

`Screen` → `@aca/core` hook (useQuery/useMutation) → Supabase client (core). A zod contract
validates each row at the boundary. Realtime: a Postgres change on the `supabase_realtime`
publication hits a `@aca/core` channel → `invalidateForTable(queryClient, table)` → affected
queries refetch → both partners' UIs stay in sync.

## Hard rules (must follow)

- **Zero personal data in source.** Everything personal lives in `couple.config.ts` (neutral
  placeholders upstream). Never write a real name into source.
- **Secrets only in gitignored `.env`** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TMDB_API_KEY`);
  `.env.example` ships placeholders.
- **All styling from `@aca/ui`** — no ad-hoc colors/spacing in apps; both apps look identical.
- **Only `packages/core` imports `@supabase/supabase-js`** (lint-enforced); apps use `@aca/core`.
- **English only** for code, docs, comments, commits; UI strings are translatable via `@aca/i18n`.

## Adding an app

Compose the shared foundation; never edit shared packages for app-specific shape/strings.
Two seams: (1) declare a typed DB by extending `BaseDatabase` and bind `useSupabase<DB>()`;
(2) register an app i18n namespace on the shared instance (`common` is the fallback).
`apps/movies` is the worked example.

## Commands

- **Dev:** `pnpm dev` · **Build:** `pnpm build` · **Test:** `pnpm test` · **Lint:** `pnpm lint`
- **Typecheck:** `pnpm typecheck` · **Format:** `pnpm format` · **Web e2e:** `pnpm e2e`
- **Gate:** `pnpm preflight` (format:check → lint → typecheck → test → build); mirrored by a
  pre-push hook and an aggregate `ci-gate` in CI.
- **OpenSpec scripts:** `node scripts/opsx/<script>.mjs` (state, linters, guards).

## Commit convention

`type(scope): description` — types: `feat fix docs refactor test build ci chore`;
scopes: `ui config i18n core eslint-config typescript-config movies plans openspec ci docs deps`.

## Status (2026-05)

Foundation + movies app implemented and web-verified (PR #1, unmerged). Not yet closed:
native iOS/Android never built/run; CI written but not executed; OpenSpec verify→archive loop
not run (`openspec/specs/` empty). Near-term focus: Phase 6.5 — make the watchlist genuinely
couple-friendly toward v1. See `ROADMAP.md` and `docs/reviews/2026-05-foundation-review.md`.
