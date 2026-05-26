## Why

"A Couple Apps" is a new open-source monorepo that will host several small apps for couples (first two: a shared movie watchlist and a shared plans/events list). There is no code yet. Before any feature work, the repository needs a foundation that makes adding a new cross-platform app trivial, keeps both apps visually identical from a single source of truth, ships zero personal data in source, and is governed by the same spec-driven workflow used in the maintainer's `gymos` and `mirrorflow` projects.

This change establishes that foundation. It is intentionally infrastructure-only: it scaffolds the monorepo, the shared packages, the configuration and secrets model, the i18n layer, the data/auth layer, the testing and CI spine, the OpenSpec/opsx workflow (which this very change is authored in, so the foundation is self-hosting), and open-source hygiene. The two end-user apps are explicitly out of scope and will land as their own changes once the foundation is approved and applied.

The design reuses the maintainer's existing conventions wherever they are language-agnostic (OpenSpec SDD spine, `.claude/` setup, Conventional Commits, shared `eslint-config`/`typescript-config` packages, zod-validated config, label-gated CI with an aggregate gate, Renovate, English-only docs) and adapts the web/Flutter-specific parts for React Native + Expo (Expo Router, React Native Web, Tamagui, `@testing-library/react-native`, Maestro, EAS).

## What Changes

- Scaffold a **pnpm workspaces + Turborepo** monorepo with `apps/*` (Expo apps) and `packages/*` (shared libraries), mirroring `mirrorflow`'s layout and tooling.
- Establish **cross-platform delivery** via Expo + React Native + React Native Web so every app runs on iOS, Android, and web from one codebase.
- Create the shared packages: `ui` (Tamagui design system, the single source of truth so both apps look identical), `config` (typed loader + zod schema for `couple.config.ts`), `i18n` (en/es translations + language switching that also drives external data language), `core` (Supabase client, auth, shared data hooks, realtime), plus `eslint-config` and `typescript-config`.
- Add a single root **`couple.config.ts`** validated by a zod schema, shaped `{ config: <shared>, movies, plans }`: the `config` block holds shared settings (the two people, default language `en` | `es`, optional theme overrides) and each app section holds its own settings plus an `enabled` flag. It ships with a committed **neutral placeholder**; no personal names ever appear in source.
- Separate **secrets from config**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TMDB_API_KEY` live in `.env` (with a committed `.env.example`), never committed, with secret-scanning and a `SENSITIVE_ENV_VARS` registry.
- Wire **i18n** so all UI strings are translatable (en/es) and the configured language also drives EXTERNAL data (e.g. TMDB `language=es-ES` / `en-US`). All source, docs, comments, and markdown remain English.
- Stand up the **testing spine**: Vitest + `@testing-library/react-native` for unit/component tests, Maestro for native (iOS/Android) e2e, Playwright for web e2e against the React Native Web build, with coverage thresholds.
- Stand up the **CI spine**: a reusable composite `setup-repo` action, SHA-pinned actions, `dorny/paths-filter`, label-gated jobs, and an aggregate `ci-gate`; plus Husky + lint-staged + commitlint so a green local pre-push implies green CI.
- Port the **OpenSpec + opsx/osx workflow** (pruned to what this repo will actually use): `openspec/{config.yaml, project.md, specs/, changes/, templates/, schemas/, manual-checks/}`, the `.opsx-state.json` lifecycle, verify/review report parsers, the archive→PR pipeline, `lint-tasks-md`, the archive-doc guard, and `project-config`. Flutter-only Dart gates and web-server CI jobs (trivy/sbom/lighthouse/oss-validation) and npm-publish provenance are intentionally NOT ported.
- Add **open-source hygiene**: MIT `LICENSE` with author attribution, `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, a "fork this for your own couple" guide, and a Renovate config.

## Capabilities

### New Capabilities

- `monorepo-foundation`: pnpm + Turborepo workspace, `apps/*` + `packages/*` boundaries, and a documented "add a new app" path.
- `couple-config`: root `couple.config.ts`, its zod schema and typed loader, neutral placeholders, and the zero-personal-data-in-source guarantee.
- `design-system`: `packages/ui` Tamagui design system — shared tokens/themes consumed by every app so they render identically across iOS/Android/web; theme overrides flow from `couple.config.ts`.
- `i18n`: `packages/i18n` translations (en/es) + language switching, and the rule that the configured language drives external data queries.
- `data-and-auth`: `packages/core` Supabase client, auth, shared data hooks, and realtime sync between the two users.
- `secrets-and-env`: secrets separated from config, `.env.example`, the `SENSITIVE_ENV_VARS` registry, and secret scanning.
- `quality-tooling`: shared `eslint-config`/`typescript-config` packages, Prettier, strict TypeScript, Conventional Commits via commitlint, and Husky + lint-staged hooks.
- `testing`: the unit/component (Vitest + Testing Library Native) and e2e (Maestro native + Playwright web) strategy with coverage thresholds.
- `ci`: the GitHub Actions spine — composite setup action, SHA-pinned actions, paths-filter, label gating, and the aggregate `ci-gate`.
- `spec-driven-workflow`: the OpenSpec + opsx/osx setup that governs every future change, plus the `.claude/` agents, commands, and skills.
- `open-source-hygiene`: MIT license with attribution, README/CONTRIBUTING/ARCHITECTURE, and the fork-for-your-own-couple flow.

### Modified Capabilities

_(none — this is the repository's first change; every capability is new)_

## Impact

- **Affected files**: the entire repository scaffold (root configs, `apps/`, `packages/`, `.claude/`, `.github/`, `openspec/` infrastructure, `scripts/opsx/`, docs). No end-user feature code.
- **Affected packages**: creates `packages/ui`, `packages/config`, `packages/i18n`, `packages/core`, `packages/eslint-config`, `packages/typescript-config`; creates empty `apps/` ready for the first app change.
- **New runtime dependencies** (with rationale in `design.md`): Expo SDK + React Native + React Native Web (cross-platform runtime); Tamagui (cross-platform design system); `@supabase/supabase-js` (backend + realtime); TanStack Query + Zustand (server-cache + local state); `i18next` + `react-i18next` + `expo-localization` (i18n); `zod` (config/env validation).
- **New dev dependencies**: pnpm, Turborepo, Vitest, `@testing-library/react-native`, Playwright, Maestro, ESLint + `typescript-eslint` + `eslint-config-expo`, Prettier, commitlint, Husky, lint-staged, syncpack, Renovate.
- **Backend**: Supabase (free tier), one project. This change provisions the client and a `shared` Postgres schema (+ auth/realtime plumbing) only; per-app schemas (`movies`, `plans`) ship with their app changes.
- **Secrets**: introduces `.env` usage. No secret values are committed; `.env.example` ships with placeholders.
- **Test coverage**: establishes the harness and thresholds; the foundation's own non-trivial code (config loader, env parser, i18n language resolver, theme override merge) ships with unit tests.
- **Rollback**: the change is additive to an empty repository; rollback is `git revert` of the bootstrap commits or deleting the scaffold. No data or users exist yet.
- **Out of scope**: the movie-watchlist app, the plans/events app, any Supabase table schema beyond auth/realtime plumbing, and the heavier reference-repo automation that this repo will not use (see `proposal.md` → What Changes, and `design.md` → Decisions).
