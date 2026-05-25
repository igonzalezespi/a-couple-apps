# A Couple Apps

Small cross-platform apps for a couple to share -- a movie watchlist today, shared
plans/events next. One Expo + React Native codebase runs on **iOS, Android, and web**.

## Open source code, private per-couple app

This repository is open source, but it is **not** a hosted, multi-tenant service and is
**not** meant to be one. Each couple runs **their own** instance:

- The **code** is public and reusable (MIT, see [License](#license)).
- A running **app** belongs to exactly one couple and talks to **that couple's own**
  Supabase project. There is no shared backend, no public sign-up, no "everyone" database.
- There is **no login**. A build is private to one couple, so on first launch the app just
  asks **which of the two people you are** (saved on-device) and attributes what you add to
  them. The couple's own Supabase keys are the boundary; Row Level Security targets `anon`,
  with no `couples` table and no tenant column.

Want it for yourself? **Fork it, create your own Supabase project, and build it.** See
[Self-hosting your own instance](#self-hosting-your-own-instance). Personal data (names,
language, theme) lives only in `couple.config.ts`; upstream ships neutral placeholders and
no real values are ever committed.

## Apps

| App      | Status        | What it does                                                       |
| -------- | ------------- | ------------------------------------------------------------------ |
| `movies` | usable        | Search movies (TMDB), a shared watchlist, mark watched, realtime sync |
| `plans`  | planned       | Shared plans/events list (Phase 7)                                 |

## Tech stack

- **Monorepo:** pnpm workspaces + Turborepo, Node >= 24, TypeScript (strict)
- **Runtime:** Expo + React Native + React Native Web, Expo Router (file-based)
- **UI:** Tamagui design system in `packages/ui` (single source of truth -- both apps look identical)
- **State:** TanStack Query (server cache) + Zustand (local UI state)
- **Backend:** Supabase (one project per couple; `shared` + per-app schemas) + Realtime
- **i18n:** i18next + expo-localization (en/es); the chosen language also drives external data (TMDB)
- **Tests:** Vitest + Testing Library (unit/component), Playwright (web e2e), Maestro (native e2e)
- **Quality:** ESLint (flat) + Prettier + commitlint + Husky; spec-driven via OpenSpec

## Layout

```
apps/
  movies/            Expo app: shared movie watchlist
packages/
  ui/                Tamagui tokens, themes, primitives (all styling lives here)
  core/              the only data boundary: Supabase client, person selection, realtime, query, zod contracts
  config/            zod schema + loader for couple.config.ts; env parsing
  i18n/              en/es translations, language switching, resolveExternalLang()
  eslint-config/     shared flat ESLint config
  typescript-config/ shared tsconfig bases
supabase/migrations/ SQL schema (shared + per-app), RLS, realtime
openspec/            spec-driven change proposals + canonical specs
```

Apps depend on packages; packages never depend on apps. Only `packages/core` imports
`@supabase/supabase-js` -- apps use `@aca/core` hooks.

## Prerequisites

- **Node >= 24** (`.nvmrc` pins 24)
- **pnpm 10** -- `corepack enable && corepack prepare pnpm@10.25.0 --activate`
- A **Supabase** project (free tier is fine) and a **TMDB** v3 API key for the movies app

## Quick start

```bash
git clone https://github.com/igonzalezespi/a-couple-apps.git
cd a-couple-apps
pnpm install

# 1. Configure your couple
cp couple.config.example.ts couple.config.ts   # then edit names / language / theme

# 2. Configure secrets (.env.example documents both sets of vars)
cp .env.example apps/movies/.env                 # the app reads EXPO_PUBLIC_* from here -- fill those in
cp .env.example .env                             # optional root copy for tooling/scripts

# 3. Run
pnpm --filter movies web                         # web dev server
# or: pnpm --filter movies dev                   # Expo (iOS/Android/web)
```

`.env` files are gitignored and must never be committed. The Supabase **anon** key is
client-safe (RLS enforces access); never put the `service_role` key in any client env.

## Self-hosting your own instance

1. **Create a Supabase project.** One project = one couple.
2. **Apply the schema.** With the Supabase CLI: `supabase link --project-ref <ref> && supabase db push`.
   Or paste `supabase/migrations/0001_shared_schema.sql` then `0002_movies_schema.sql` into the
   SQL Editor, in order.
3. **Expose the custom schemas.** Dashboard -> Project Settings -> API -> **Exposed schemas**:
   add `shared` and `movies` (PostgREST only exposes `public` by default; the app calls
   `.schema('movies')`).
4. **Fill `.env`** with your project URL + anon key and your TMDB key (step 2 of Quick start).
5. **Fill `couple.config.ts`** with your two people, default language, and optional theme.
   There is **no login** -- the app asks which of the two you are on first launch, so the
   names you set here are exactly what each of you picks. No emails, no auth, no SMTP to set up.

Keep your filled `couple.config.ts` and `.env` local to your instance -- do not push real
personal data or keys to a public fork.

## Commands

| Command                                   | What it does                                      |
| ----------------------------------------- | ------------------------------------------------- |
| `pnpm dev`                                 | run all apps (Expo) in parallel                   |
| `pnpm --filter movies web`                 | movies on web                                     |
| `pnpm test`                                | unit/component tests (Vitest) + opsx script tests |
| `pnpm e2e`                                 | web e2e smoke (Playwright; hermetic, no secrets)  |
| `pnpm lint` / `pnpm typecheck`             | lint / typecheck the workspace                    |
| `pnpm build`                               | build all apps (`expo export -p web`)             |
| `pnpm preflight`                           | format:check -> lint -> typecheck -> test -> build |

Native e2e flows live in `.maestro/` and run on a local simulator/emulator (see
`.maestro/README.md`).

## Contributing

Code contributions to the shared foundation and apps are welcome. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the spec-driven workflow, branching, and the quality
gate. The system design is in [ARCHITECTURE.md](ARCHITECTURE.md); development is documented as
OpenSpec changes under `openspec/`; the phased plan is in [ROADMAP.md](ROADMAP.md).

## License

MIT -- see [LICENSE](LICENSE).
