## Context

This is the first change in a brand-new repository. The maintainer has two reference projects whose conventions this monorepo must inherit:

- `gymos` (Flutter) — single package, but the origin of the OpenSpec/opsx SDD workflow, the "pre-push mirrors CI" discipline, SHA-pinned actions, CI-minute frugality, and documented dependency holds.
- `mirrorflow` (React/TypeScript) — a pnpm + Turborepo monorepo: shared `eslint-config`/`typescript-config` packages, strict TS, Vitest + Playwright, commitlint + Husky + lint-staged, zod-validated config + `SENSITIVE_ENV_VARS`, label-gated CI with an aggregate `ci-gate`, MADR ADRs, and the same OpenSpec/opsx machinery as `gymos`.

The new project is **React Native + Expo** (cross-platform iOS/Android/web), which neither reference repo is. The tooling/process spine carries over from `mirrorflow`; the runtime layer is new and Expo-shaped.

Constraints:

- Adding a new app must be trivial: drop a folder under `apps/*`, consume shared packages, done.
- Both apps MUST look identical — one design-system source of truth (`packages/ui`).
- Zero personal data in source. Everything personal lives in `couple.config.ts`, which ships with neutral placeholders.
- Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TMDB_API_KEY`) are separate from config and never committed.
- English-only source/docs/comments; UI strings translatable (en/es); the configured language also drives external data (TMDB).
- Free-tier Supabase with realtime sync between the two users.
- Testing and CI baked in from the start.
- Open-source portfolio repo: clean, forkable, MIT + author attribution, but not over-engineered.

Stakeholders: the maintainer (solo, AI-assisted via Claude Code) and future forkers ("clone it for your own couple").

## Proposed Architecture

### Folder tree

```
a-couple-apps/
├── apps/
│   ├── movies/                # App 1 — shared movie watchlist (future change)
│   │   ├── app/               # Expo Router routes (file-based)
│   │   ├── src/{components,features,hooks,lib}/
│   │   ├── app.config.ts      # Expo config (reads couple.config + env)
│   │   ├── index.ts  package.json  tsconfig.json
│   └── plans/                 # App 2 — shared plans/events (future change)
├── packages/
│   ├── ui/                    # @aca/ui — Tamagui design system: tokens, themes,
│   │   │                      #   primitives, shared components. ONE source of truth.
│   │   └── src/{tokens,themes,components}/  tamagui.config.ts
│   ├── config/                # @aca/config — zod schema + typed loader for couple.config.ts
│   │   │                      #   ({ config: shared, movies, plans }); env + SENSITIVE_ENV_VARS.
│   │   └── src/{schema.ts,load.ts,env.ts}
│   ├── i18n/                  # @aca/i18n — i18next setup, en/es resources,
│   │   │                      #   useLocale(), resolveExternalLang() (TMDB es-ES/en-US).
│   │   └── src/{index.ts,locales/{en,es}.ts,external.ts}
│   ├── core/                  # @aca/core — Supabase client, auth hooks, realtime,
│   │   │                      #   TanStack Query setup, shared data hooks + zod contracts.
│   │   └── src/{supabase.ts,auth/,realtime/,query/,contracts.ts}
│   ├── eslint-config/         # @aca/eslint-config — shared flat config (base + expo + rn)
│   └── typescript-config/     # @aca/typescript-config — base.json + react-native.json
├── couple.config.ts           # ROOT config { config: shared, movies, plans } — only personal data here
├── couple.config.example.ts   # documented template with neutral placeholders
├── .env.example               # SUPABASE_URL / SUPABASE_ANON_KEY / TMDB_API_KEY placeholders
├── .claude/                   # agents/, commands/{opsx,osx}/, skills/, settings*.json
├── .github/
│   ├── actions/setup-repo/    # composite: pnpm + node + frozen install
│   ├── workflows/             # quality-gates.yml, e2e.yml, release.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                    # pre-commit, commit-msg, pre-push (mirrors CI)
├── openspec/                  # config.yaml, project.md, specs/, changes/, templates/,
│                              #   schemas/, manual-checks/  (SDD spine)
├── scripts/opsx/              # pruned opsx automation (state, parsers, archive→PR, linters)
├── supabase/                  # one project; migrations/: shared schema + per-app schemas
├── docs/                      # ARCHITECTURE.md, decisions/ (MADR ADRs), kb/
├── e2e/                       # Playwright web specs + helpers
├── .maestro/                  # Maestro native e2e flows (YAML)
├── package.json  pnpm-workspace.yaml  turbo.json  tsconfig.json
├── eslint.config.mjs  prettier.config.mjs  commitlint.config.mjs  .syncpackrc.mjs
├── renovate.json  .nvmrc  .npmrc
├── README.md  CONTRIBUTING.md  CHANGELOG.md  LICENSE  ROADMAP.md
```

> Package scope: `@aca/*` ("a couple apps"). All shared packages are `private: true` (not published).

### Package boundaries

- **Apps depend on packages; packages never depend on apps.** Enforced in `eslint-config` via `no-restricted-imports` (no cross-package relative paths; use workspace aliases), mirroring `mirrorflow`.
- **`ui` is presentation-only** — no data, no Supabase, no config I/O. It receives a resolved theme. This is the single source of truth for look-and-feel; both apps render identically because they import the same primitives.
- **`config` is pure** — parses/validates `couple.config.ts` and env; depends on nothing but `zod`.
- **`i18n` depends on `config`** (for default language) and is otherwise standalone.
- **`core` is the only data boundary** — Supabase client, auth, realtime, and shared hooks live here; apps never import `@supabase/supabase-js` directly. Request/response shapes are zod contracts in `core/src/contracts.ts` (the `mirrorflow` "all shapes match a contract" rule).
- **`eslint-config` / `typescript-config`** are leaf config packages consumed by every workspace.

### Tech choices (with short justifications)

| Concern | Choice | Why | Reference |
|---|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | The maintainer's existing monorepo tooling; trivial app addition; task caching | `mirrorflow` |
| Runtime | Expo + React Native + React Native Web | One codebase → iOS/Android/web; satisfies the "React + React Native" requirement | new (Expo) |
| Routing | Expo Router (file-based) | Standard Expo navigation; works across native + web | new |
| Design system | Tamagui | Purpose-built cross-platform tokens/themes + compiler; one source of truth, identical native+web; light/dark/custom themes map cleanly to `couple.config` overrides | chosen (Q1) |
| Data/server-state | TanStack Query | Caching/sync/refetch over Supabase; realtime updates feed the cache | new |
| Local/UI state | Zustand | The maintainer's `mirrorflow` choice; minimal | `mirrorflow` |
| Backend | Supabase (free tier) + realtime | Mandated; auth + Postgres + realtime in one | required |
| Config validation | zod (`couple.config.ts`) | `mirrorflow`'s typed-config pattern; placeholders, no personal data | `mirrorflow` |
| i18n | i18next + react-i18next + expo-localization | De-facto RN i18n; device-locale detection overridden by config; drives TMDB language | new |
| Lint/format | ESLint flat + typescript-eslint + eslint-config-expo + Prettier | `mirrorflow` shared-config-package pattern + Expo's RN rules | `mirrorflow` + Expo |
| Types | strict TS, `base.json` + `react-native.json` | `mirrorflow` strictness (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) + RN variant | `mirrorflow` |
| Unit/component tests | Vitest + @testing-library/react-native | `mirrorflow` Vitest + RN-flavored Testing Library | `mirrorflow` (adapted) |
| e2e | Maestro (native) + Playwright (web) | Maestro = Expo's recommended native e2e; Playwright reuses `mirrorflow` knowledge for the RN-Web build | chosen (Q3) |
| Commits/hooks | Conventional Commits + commitlint + Husky + lint-staged | `mirrorflow` exactly; "pre-push mirrors CI" from `gymos` | both |
| CI | composite setup action, SHA-pinned, paths-filter, label-gated, aggregate `ci-gate` | `mirrorflow` spine + `gymos` frugality | both |
| SDD | OpenSpec + opsx/osx (pruned) | Both repos' shared workflow; this change is authored in it | both |
| Release | tag → EAS build + Keep-a-Changelog | `gymos` tag-triggered builds + `mirrorflow` changelog | both |
| Deps | Renovate + syncpack | Both repos | both |
| License | MIT + author attribution | Portfolio + forkable; not over-engineered | requested |

## Goals / Non-Goals

**Goals:**

- A monorepo where adding an app is dropping a folder under `apps/*` and consuming shared packages.
- A single design-system source of truth so both apps look identical on iOS/Android/web.
- A zod-validated `couple.config.ts` with neutral placeholders and zero personal data in source.
- Secrets separated into `.env`, with `.env.example` and secret scanning.
- i18n (en/es) that also drives external (TMDB) data language; all source/docs in English.
- Supabase client + auth + realtime plumbing ready for app features.
- Unit/component + e2e harness and CI green-on-push from day one.
- The OpenSpec/opsx workflow installed and self-hosting this change.
- MIT-licensed, documented, forkable.

**Non-Goals:**

- **End-user apps** — the movie-watchlist (`apps/movies`) and plans/events (`apps/plans`) apps ship as their own changes.
- **Per-app Supabase schemas** — table schemas beyond the `shared` schema plus auth/realtime plumbing.
- **Unused reference-repo automation** — Flutter/Dart lint gates, container/trivy/sbom/lighthouse/oss-validation CI jobs, npm publish + provenance, Stryker mutation testing (deferred, not adopted now).
- **App-store submission automation** — EAS build only; store submit is manual/later.
- **Offline-first sync** — CRDT semantics beyond Supabase realtime.

## Decisions

### D1: pnpm + Turborepo monorepo with `apps/*` + `packages/*`

Adopt `mirrorflow`'s exact monorepo spine: `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json` task graph, `.npmrc` (`engine-strict`, `only-allow pnpm`), `.nvmrc`, syncpack for internal `workspace:*` ranges.

**Why**: It is the maintainer's established convention and the explicit fallback in the brief. Turborepo caching keeps CI cheap; pnpm workspaces make app addition trivial.

**Alternative considered**: Nx (heavier, opinionated generators) and Bun workspaces (less mature for RN/Expo). Rejected — neither is in the reference repos and both add migration risk.

### D2: Expo + React Native + React Native Web, Expo Router

Each app is an Expo app using Expo Router; the web target is React Native Web. App config via `app.config.ts` (reads `couple.config.ts` + env).

**Why**: One codebase for iOS/Android/web directly satisfies the "React + React Native" requirement. Expo gives EAS builds, OTA updates, and a managed native layer suitable for a solo maintainer.

**Alternative considered**: Bare React Native + separate web (react-dom) app. Rejected — duplicates UI, breaks the "both apps identical, one codebase" goal and the trivial-app-addition goal.

### D3: Tamagui as the single design-system source of truth

`packages/ui` is a Tamagui design system: tokens + themes in `tamagui.config.ts`, primitives and shared components on top. Apps import only from `@aca/ui`. `couple.config.ts` theme overrides are merged into the Tamagui theme.

**Why**: Tamagui is built for exactly this — typed cross-platform tokens, named themes (light/dark/custom), and an optimizing compiler so the same component renders identically on native and web. It makes "both apps look identical" a structural guarantee, not a discipline.

**Alternative considered**: NativeWind v4 (simpler, Tailwind tokens) and vanilla StyleSheet + a typed theme object (closest to `mirrorflow`'s plain-CSS philosophy). Both are viable; Tamagui was chosen for its first-class theming/token system and design-system ergonomics. (Selected in Q1.)

### D4: `core` is the only data boundary; TanStack Query + Zustand; Supabase realtime

All Supabase access, auth, and realtime live in `packages/core`. Server cache/sync uses TanStack Query; realtime subscriptions invalidate/update the query cache so both users stay in sync. Local UI state uses Zustand. Apps never import `@supabase/supabase-js` directly; they call `@aca/core` hooks. Shapes are zod contracts in `core/src/contracts.ts`. Backend layout: **one Supabase project** with a `shared` Postgres schema for cross-app data (the couple, profiles) and a dedicated schema per app (`movies`, `plans`); the foundation ships only the `shared` schema plus auth/realtime plumbing, and each app change adds its own schema with RLS.

**Why**: Mirrors `gymos`'s "pure domain core, repositories as the only data boundary" and `mirrorflow`'s "all shapes match a zod contract." Centralizing Supabase keeps apps thin and realtime consistent. TanStack Query is the standard server-state layer for Supabase; Zustand matches `mirrorflow`.

**Alternative considered**: Legend-State with the Supabase sync plugin (offline-first, reactive). Rejected for now — newer, less familiar; revisit if offline becomes a requirement. Plain hand-rolled hooks over `supabase-js` — rejected: more boilerplate, manual cache/realtime wiring.

### D5: `couple.config.ts` (zod) holds all personal data; source ships neutral placeholders

A single root `couple.config.ts` validated by `packages/config`'s zod schema is split by section: `{ config: <shared>, movies: <app>, plans: <app> }`. The `config` block holds everything shared across apps — the two people (`{ id, displayName }` × 2), `defaultLanguage: 'en' | 'es'`, and optional `theme` overrides. Each app key holds that app's own settings plus an `enabled` flag (so an app can be configured but turned off; presence + `enabled` replaces a separate `enabledApps` list). `@aca/config` validates the `config` block strictly and exposes typed accessors (`getSharedConfig()`, `getAppConfig('movies')`); each app contributes its own zod slice for its section via a `defineCoupleConfig` helper, so app config stays co-located with the app while living in one root file. `couple.config.example.ts` is the documented template with placeholders (e.g. `personA`, `personB`); the upstream repo commits a neutral placeholder `couple.config.ts` so the apps run on clone — names like "Ivan" never appear in source.

**Why**: Directly enforces "zero hardcoded personal data" and "names must never appear in source." zod gives a typed, validated, documented single entry point and extends `mirrorflow`'s config pattern.

**Alternative considered**: JSON/YAML config. Rejected — loses type-safety and the ability to express typed theme overrides; a `.ts` file validated by zod is both typed and ergonomic.

### D6: Secrets separated from config into `.env`, with a `SENSITIVE_ENV_VARS` registry

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TMDB_API_KEY` live in `.env` (gitignored), with a committed `.env.example`. Client-exposed values use Expo's `EXPO_PUBLIC_*` convention. `packages/config/src/env.ts` provides typed parsers and exports `SENSITIVE_ENV_VARS`; gitleaks runs in pre-push and CI.

**Why**: Config (who/what/look) and secrets (keys) have different lifecycles and audiences. This is `mirrorflow`'s exact model and keeps secrets out of the typed config surface and out of git.

**Alternative considered**: Putting keys in `couple.config.ts`. Rejected — conflates secrets with shareable config and risks committing keys.

### D7: i18n drives both UI and external data language

`packages/i18n` uses i18next + react-i18next with en/es resource bundles and `expo-localization` for device-locale detection. The effective language resolves as: explicit user setting → `couple.config.defaultLanguage` → device locale → `en`. `resolveExternalLang(lang)` maps to provider codes (`es` → `es-ES`, `en` → `en-US`) so TMDB queries use the configured language.

**Why**: Satisfies "UI strings translatable" and "configured language drives EXTERNAL data." i18next is the de-facto RN standard. Neither reference repo had i18n, so this is a net-new but conventional choice.

**Alternative considered**: lingui (compile-time catalogs) and a hand-rolled dictionary. Rejected — i18next has the largest RN ecosystem and runtime language switching out of the box.

### D8: OpenSpec/opsx ported in full, minus what this repo won't use

Port the language-agnostic SDD spine verbatim: `openspec/{config.yaml, project.md, specs/, changes/, templates/, schemas/, manual-checks/}`, the `.opsx-state.json` lifecycle + JSON schema, `scripts/opsx/{state,project-config,verify-report-parser,verify-report-lint,review-report-lint,lint-tasks-md,lint-manual-checks,archive-doc-edit-guard,post-archive-safety-check}.mjs`, and the `.claude/` agents + `opsx`/`osx` commands + `openspec-*`/`osx-*`/`sdd-workflow` skills. Tune `config.yaml`'s `context:` block and `quick-change` disqualifiers for this stack.

**Prune** (do NOT port): `gymos`'s Flutter-specific Dart gates (`a11y_ux_lint.dart`, `engine_complexity.dart`, `engine_duplication_check.dart`, `keep_alive_justification_check.dart`), `audit-roadmap-pointer-lint`/`preflight-gate-presence-lint`/`medium-deferrals-lint` (project-specific to those repos), the `vgv-*` Flutter skills, and the web-server CI jobs (trivy/sbom/lighthouse/oss-validation) + npm-publish provenance. Stryker mutation testing is deferred (not adopted in the foundation).

**Why**: The maintainer asked for "full opsx but not the things we will not use." The spine (proposal/design/tasks/delta-specs, RFC-2119 + GIVEN/WHEN/THEN, verify/review reports, archive→PR, manual-checks) is the high-value, language-agnostic crown jewel and ports cleanly. The pruned items are either Flutter-only or specific to the other repos' audit history.

**Alternative considered**: Streamlined core now, automate later. Rejected per Q2 — the maintainer wants the real automation, carefully pruned.

### D9: e2e = Maestro (native) + Playwright (web); unit/component = Vitest + Testing Library Native

Maestro YAML flows under `.maestro/` cover iOS/Android; Playwright under `e2e/` drives the React Native Web build (`expo start --web` / exported web). Vitest + `@testing-library/react-native` cover unit/component, with coverage thresholds (global 80, critical packages 85) and `type-coverage` ≥ 95, mirroring `mirrorflow`.

**Why**: Covers all three targets. Maestro is Expo's recommended, low-friction native e2e; Playwright reuses the maintainer's existing web-e2e knowledge against the real RN-Web output. (Selected in Q3.)

**Alternative considered**: Detox + Playwright (heavier, flakier, not in the reference repos) and Maestro-only (no automated web e2e). Rejected per Q3.

### D10: CI spine from `mirrorflow`, frugality from `gymos`

A composite `./.github/actions/setup-repo` (pnpm + Node + frozen install), all third-party actions SHA-pinned with a version comment, `dorny/paths-filter` to scope jobs, label-gated expensive jobs (`ci:e2e`, `ci:full`), `concurrency` groups, and a final `ci-gate` aggregator that fails unless every needed job is `success`/`skipped`. `.husky/pre-push` mirrors the CI gates so a green push implies green CI.

**Why**: Combines `mirrorflow`'s robust gate aggregation with `gymos`'s CI-minute thrift (GitHub Free plan). The pre-push-mirrors-CI rule (from both repos) keeps cloud minutes low.

**Alternative considered**: Run everything on every push. Rejected — wasteful on free-tier minutes and slow feedback.

### D11: MIT license with author attribution

`LICENSE` is MIT with the maintainer's copyright line; `README.md` credits the author and links the portfolio context. A short "Fork this for your own couple" section documents the clone → `cp couple.config.example.ts couple.config.ts` → `cp .env.example .env` → fill-in flow.

**Why**: The brief asks for MIT + light author credit for a portfolio repo, "not much." MIT is the simplest permissive license; attribution lives in `LICENSE` + README rather than per-file headers (lighter than `mirrorflow`'s FSL headers).

**Alternative considered**: `mirrorflow`'s FSL + per-file license headers. Rejected — heavier than requested for a small portfolio repo.

## Risks / Trade-offs

- **[Tamagui setup/compiler complexity]** → Mitigation: confine Tamagui to `packages/ui`; apps consume primitives only. A `ui` Storybook/preview screen validates tokens render identically on web + native early (Phase 2 acceptance).
- **[Expo Router + React Native Web parity gaps]** → Mitigation: web e2e (Playwright) and native e2e (Maestro) run the same flows; any web-only divergence is caught in CI. Keep platform-specific code behind `.native.tsx`/`.web.tsx` splits only where unavoidable.
- **[Porting opsx automation faithfully is non-trivial]** → Mitigation: port `scripts/opsx/*.mjs` with their existing `__tests__`; run `lint-tasks-md`/`verify-report-lint` against this change's own artifacts as the first proof.
- **[Supabase free-tier limits / realtime quotas]** → Mitigation: two-user scale is far under free-tier limits; document limits in `docs/`. Realtime channels are per-couple, low-volume.
- **[Secrets accidentally committed]** → Mitigation: gitleaks in pre-push + CI, `.env` gitignored, `SENSITIVE_ENV_VARS` registry, `.env.example` placeholders only.
- **[Scope creep into app features]** → Mitigation: apps are explicit non-goals; the `apps/` dirs ship empty/placeholder until their own changes.

## Migration Plan

This is a greenfield bootstrap; "migration" is the ordered build sequence (detailed in `ROADMAP.md`):

1. Repo init + tooling spine + OpenSpec/opsx self-hosting (so subsequent phases are spec-driven).
2. `packages/typescript-config` + `packages/eslint-config` + Prettier/commitlint/Husky.
3. `packages/ui` (Tamagui tokens/themes/primitives).
4. `packages/config` (`couple.config.ts` schema + loader + env).
5. `packages/i18n` (en/es + external-language resolver).
6. `packages/core` (Supabase client/auth/realtime/query).
7. Testing harness (Vitest + Testing Library Native + Maestro + Playwright) and CI spine.
8. Open-source hygiene (LICENSE/README/CONTRIBUTING/ARCHITECTURE + fork guide).

Apps 1 and 2 follow as separate changes after this foundation is approved, applied, and verified.

Rollback: `git revert` the bootstrap commits (additive to an empty repo) — no users or data exist.

## Resolved (confirmed by the maintainer, 2026-05-24)

- **Package scope**: `@aca/*` ("a couple apps"); packages remain private.
- **App directory names**: `apps/movies` + `apps/plans`.
- **Config file**: a single committed `couple.config.ts` (neutral placeholder) shaped `{ config: <shared>, movies: <app>, plans: <app> }` — shared block + per-app sections, each app section carrying its own `enabled` flag. See D5.
- **Supabase**: one project; a `shared` Postgres schema for cross-app data and a dedicated schema per app (`movies`, `plans`). The foundation ships the `shared` schema + auth/realtime only; per-app schemas land with their app changes. See D4.

## Open Questions

_(none outstanding — the four foundation questions above are resolved. New questions will be raised per app change.)_
