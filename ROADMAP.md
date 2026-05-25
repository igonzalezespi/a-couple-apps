# Roadmap — A Couple Apps

A phased plan from empty repo to first release. Each phase lists concrete tasks,
acceptance criteria (how we know it's done), and the shared package(s) it touches.

Development is spec-driven: each phase (or sub-feature) is an OpenSpec change
(`proposal.md` → `design.md` → `tasks.md` → delta specs → review → apply → verify
→ archive→PR). The foundation itself is the `bootstrap-foundation` change in
`openspec/changes/`.

Conventions are inherited from the maintainer's `gymos` and `mirrorflow` repos:
pnpm + Turborepo, strict TypeScript, Vitest + Testing Library + Playwright,
Conventional Commits + Husky, label-gated CI with an aggregate `ci-gate`, English-only
source/docs. Runtime is React Native + Expo (iOS/Android/web from one codebase),
design system is Tamagui, backend is Supabase (free tier) with realtime.

Status legend: ⬜ not started · 🟡 in progress · ✅ done

---

## Phase 0 — Foundation approval & repo init

**Goal:** Approve this plan, then initialize the repo and the spec-driven workflow.

**Tasks**
- Review and approve the Conventions Report, architecture, and `bootstrap-foundation` proposal.
- `git init`; default branch `main`; add `.gitignore`, `.gitattributes`, `.nvmrc`, `.npmrc`.
- Install the OpenSpec/opsx workflow so every later phase is spec-driven (`openspec/config.yaml`, `project.md`, templates, schemas, `scripts/opsx/*`, `.claude/`, root `CLAUDE.md`).

**Acceptance criteria**
- Repo is a git repository with the agreed tooling baseline committed.
- `openspec validate bootstrap-foundation` (ported equivalent) and the opsx linters pass against this change's own artifacts.
- `/osx:review` has run on `bootstrap-foundation` before `/opsx:apply`.

**Packages touched:** _(repo infra)_ · `spec-driven-workflow`

---

## Phase 1 — Monorepo scaffold & tooling spine

**Goal:** A green, empty pnpm + Turborepo workspace with shared lint/type/format/commit config.

**Tasks**
- Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, syncpack.
- `packages/typescript-config` (`base.json` + `react-native.json`).
- `packages/eslint-config` (base + expo + cross-package boundary rule).
- Prettier, commitlint, Husky (`pre-commit`, `commit-msg`, `pre-push` mirroring CI).

**Acceptance criteria**
- `pnpm install --frozen-lockfile` + `pnpm build` exit 0 on an empty workspace.
- `pnpm lint` + `pnpm typecheck` + `pnpm format:check` green.
- A deliberate cross-package relative import fails lint; a non-conventional commit is rejected.

**Packages touched:** `monorepo-foundation`, `quality-tooling`

---

## Phase 2 — Shared UI / theme (`packages/ui`)

**Goal:** The single design-system source of truth so both apps look identical everywhere.

**Tasks**
- Tamagui `tamagui.config.ts`: tokens (color/space/radius/size/font) + light/dark themes.
- Core primitives (Button, Text, Card, Screen, Stack), `TamaguiProvider` wrapper, compiler plugin.
- `createCoupleTheme(overrides)` to merge config-driven theme overrides.
- A token/primitive preview screen for visual parity checks.

**Acceptance criteria**
- A primitive renders with identical resolved tokens on web and native test envs.
- A `theme` override changes the resolved token; removing it restores the default.
- Component tests (Vitest + Testing Library Native) pass.

**Packages touched:** `design-system` (`packages/ui`)

---

## Phase 3 — Config system (`couple.config.ts`)

**Goal:** All personal data lives in one zod-validated config; zero personal data in source.

**Tasks**
- zod schema for a single `couple.config.ts` shaped `{ config: shared, movies, plans }`: shared block (two people, `defaultLanguage`, optional `theme`) + per-app sections each with an `enabled` flag; `getSharedConfig()`/`getAppConfig(name)` + a `defineCoupleConfig` helper.
- Loader + readable validation errors; typed env parser + `SENSITIVE_ENV_VARS`.
- `couple.config.example.ts` (placeholders) + committed neutral placeholder `couple.config.ts`.

**Acceptance criteria**
- Valid config loads with full type inference; invalid config throws naming the bad field.
- A test asserts no personal names exist in tracked source.
- Copying the example and filling values changes both apps with no other source edits.

**Packages touched:** `couple-config` (`packages/config`), `secrets-and-env`

---

## Phase 4 — i18n (`packages/i18n`)

**Goal:** Translatable UI (en/es) with runtime switching that also drives external data language.

**Tasks**
- i18next + react-i18next; `en`/`es` resource bundles.
- Language resolution: user → config default → device locale → `en`; `useLocale()` hook.
- `resolveExternalLang(lang)` mapping (`en`→`en-US`, `es`→`es-ES`).

**Acceptance criteria**
- Resolution precedence verified; runtime switch updates strings without reload.
- Missing-translation-key guard flags gaps.
- `resolveExternalLang('es') === 'es-ES'`.

**Packages touched:** `i18n` (`packages/i18n`) · depends on `couple-config`

---

## Phase 5 — Data & auth layer (`packages/core`)

**Goal:** Supabase client, auth, and realtime sync — the only data boundary.

**Tasks**
- Supabase client wired to env via `@aca/config`; auth hooks; `QueryClient` provider.
- zod contracts in `core/src/contracts.ts`; realtime helper feeding the query cache.
- `supabase/migrations/` — one project; `shared` Postgres schema + auth/realtime plumbing only (per-app schemas land with their apps).

**Acceptance criteria**
- Sign-in exposes a session via `@aca/core`; sign-out clears it.
- A change by user A invalidates/updates user B's cache and UI without manual refresh.
- Apps importing `@supabase/supabase-js` directly fail the lint boundary.

**Packages touched:** `data-and-auth` (`packages/core`), `secrets-and-env`

---

## Phase 6 — App 1: Shared movie watchlist (`apps/movies`)

**Goal:** First real app — add/search movies (TMDB), shared watchlist, mark watched, realtime sync.

**Tasks** _(separate OpenSpec change)_
- Expo app scaffold consuming `@aca/{ui,core,i18n,config}`; Expo Router routes.
- TMDB search using `resolveExternalLang` for locale; Supabase `movies` schema + RLS.
- Watchlist CRUD via `@aca/core` hooks; realtime updates; UI from `@aca/ui` only.

**Acceptance criteria**
- Runs on iOS, Android, and web from one codebase.
- TMDB queries use the configured language; both users see the same list in realtime.
- Unit/component tests + a Maestro native flow + a Playwright web smoke pass.

**Packages touched:** consumes `ui`, `core`, `i18n`, `couple-config`; adds `apps/movies`

---

## Phase 7 — App 2: Shared plans / events (`apps/plans`)

**Goal:** Second app — shared plans/events list, proving app-addition is trivial and the UI is identical.

**Tasks** _(separate OpenSpec change)_
- Expo app scaffold (same pattern as App 1); Supabase `plans` schema (plans/events tables) + RLS.
- Create/edit/complete plans; date handling; realtime sync; UI from `@aca/ui` only.

**Acceptance criteria**
- Adding the app required no edits to shared package internals.
- Visually identical to App 1 (same tokens/themes); runs on all three platforms.
- Tests + Maestro flow + Playwright smoke pass.

**Packages touched:** consumes `ui`, `core`, `i18n`, `couple-config`; adds `apps/plans`

---

## Phase 8 — Testing & e2e hardening

**Goal:** Coverage thresholds enforced; real e2e flows for both apps on all targets.

**Tasks**
- Raise/confirm coverage thresholds (global 80, critical packages 85) and `type-coverage` ≥ 95.
- Maestro flows for the primary journeys of both apps; Playwright web specs for both.
- Shared test-utils; flaky-test triage notes.

**Acceptance criteria**
- `pnpm test` fails on sub-threshold coverage.
- `pnpm e2e` (web) green; documented Maestro flows pass on a simulator/emulator.

**Packages touched:** `testing` (all packages + both apps)

---

## Phase 9 — CI completion

**Goal:** The full label-gated pipeline with an aggregate gate; green push ⇒ green CI.

**Tasks**
- Composite `setup-repo` action; `quality-gates.yml` (paths-filter, label gating, parallel lint/typecheck/test → build → e2e → `ci-gate`).
- Web e2e job: Playwright on a Linux runner, installing the browser with `pnpm --filter movies exec playwright install --with-deps chromium` (cached); runs on every PR. Hermetic (the spec stubs Supabase + TMDB), so it needs no secrets.
- Native e2e jobs, label-gated and default-skipped (expensive): Android via `reactivecircus/android-emulator-runner` + Maestro, and iOS on a macOS runner + simulator + Maestro, each running the `.maestro/` flows. Trigger with `ci:e2e-native` (or per-platform `ci:android` / `ci:ios`); both report skipped to `ci-gate` when the label is absent. Needs repo secrets for a test Supabase project + a configured test OTP.
- SHA-pin all actions; `renovate.json`; PR template (strict schema for `/opsx:archive`).
- Confirm `pre-push` mirrors the gate.

**Acceptance criteria**
- `ci-gate` is the single required check and fails unless all needed jobs are `success`/`skipped`.
- Expensive jobs skip without the `ci:*` label; SHA-pin lint passes.
- Web e2e (Playwright) runs and passes on PRs with no secrets configured.
- Native e2e runs only when its label is present; without the label both platform jobs report skipped and `ci-gate` still passes.

**Packages touched:** `ci` (repo infra)

---

## Phase 10 — First release (v0.1.0)

**Goal:** A tagged, documented, forkable first release.

**Tasks**
- Finalize `README` (with "Fork this for your own couple"), `CONTRIBUTING`, `ARCHITECTURE`, `CHANGELOG`.
- MIT `LICENSE` + author attribution; ADR-0001 recording the foundation stack.
- `release.yml`: tag `v0.1.0` → EAS build (native) + changelog check.

**Acceptance criteria**
- A fresh clone following the README reaches a running web dev shell with placeholder config and no committed secrets (gitleaks clean).
- `v0.1.0` tag produces an EAS build; `CHANGELOG` `[Unreleased]` → dated section.

**Packages touched:** `open-source-hygiene`, `ci`

---

## Dependency order (at a glance)

```
Phase 0 (workflow) ─▶ Phase 1 (scaffold + tooling)
                         ├─▶ Phase 2 (ui)        ┐
                         ├─▶ Phase 3 (config)    ├─▶ Phase 6 (App 1) ─▶ Phase 7 (App 2)
                         ├─▶ Phase 4 (i18n)      │         └────────────┬───────────┘
                         └─▶ Phase 5 (core)      ┘                      ▼
                                                            Phase 8 (test) ─▶ Phase 9 (CI) ─▶ Phase 10 (release)
```

Phases 2–5 are independent of each other (parallelizable) once Phase 1 lands.
Apps (6–7) depend on all four shared packages. Testing/CI/release follow the apps.
