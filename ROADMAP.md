# Roadmap — A Couple Apps

A phased plan from empty repo to first release. Each phase lists concrete tasks,
acceptance criteria (how we know it's done), and the shared package(s) it touches.

Development is spec-driven: each phase (or sub-feature) is an OpenSpec change
(`proposal.md` → `design.md` → `tasks.md` → delta specs → review → apply → verify
→ archive→PR). The foundation itself is the `bootstrap-foundation` change in
`openspec/changes/`.

Conventions are inherited from the maintainer's `a Flutter project` and `a private TS monorepo` repos:
pnpm + Turborepo, strict TypeScript, Vitest + Testing Library + Playwright,
Conventional Commits + Husky, label-gated CI with an aggregate `ci-gate`, English-only
source/docs. Runtime is React Native + Expo (iOS/Android/web from one codebase),
design system is Tamagui, backend is Supabase (free tier) with realtime.

Status legend: ⬜ not started · 🟡 in progress · ✅ done

Current status (2026-05): the foundation + the movies app are implemented and **web-verified** on `feat/bootstrap-foundation` (PR #1, unmerged; `main` has only the Phase-0 scaffold). Not yet closed: native iOS/Android has never been built or run; CI is written but never executed (untracked, pending a `workflow`-scope push); the OpenSpec verify -> archive loop has not run (`openspec/specs/` is empty). See `docs/reviews/2026-05-foundation-review.md` for the full per-task verification and the critical path to v1. Near-term focus is **Phase 6.5** (below) -- making the watchlist genuinely couple-friendly -- which is what turns this into a real v1.

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

## Phase 5 — Data layer (`packages/core`)

**Goal:** Supabase client, person selection, and realtime sync — the only data boundary.

**Tasks**
- Supabase client wired to env via `@aca/config`; person-selection provider; `QueryClient` provider.
- zod contracts in `core/src/contracts.ts`; realtime helper feeding the query cache.
- `supabase/migrations/` — one project; `shared` Postgres schema + realtime plumbing only (per-app schemas land with their apps).

**Acceptance criteria**
- Selecting a person exposes it via `@aca/core`; switching person clears the selection.
- A change by user A invalidates/updates user B's cache and UI without manual refresh.
- Apps importing `@supabase/supabase-js` directly fail the lint boundary.

**Packages touched:** `data-layer` (`packages/core`), `secrets-and-env`

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

## Phase 6.5 — Make the watchlist couple-friendly (the real v1)

**Goal:** Help a couple *decide* what to watch, not just store a list -- the difference
between "functional" and "opened every Friday." (From the 2026-05 product review.)

**Done**
- Split into "To watch" (the working list) and "Watched" (history).
- Attribution: each item shows "Added by you / by your partner".
- Empty state is a call to action; the language toggle is de-emphasized.
- **Tonight's pick (headline feature).** Either partner nominates one unwatched movie; it floats
  to the top with a distinct treatment, syncs live, and auto-clears when the movie is watched or
  removed. (`picked_at` / `picked_by` on `watchlist_items` + a single-pick/clear-on-watched trigger.)

**Tasks (remaining, by value)**
- Movie detail view (`/movie/[id]`): overview, rating, year -- so a couple can choose from the list.
- Optimistic watched toggle + undo-on-remove (instant feedback; safe shared deletes).
- Search-as-you-type (debounce) + a clear button; a real settings screen (move the language switch there).

**Acceptance**
- In one screen a couple can see what's left to watch, who suggested it, and nominate tonight's pick.
- Watched items are out of the way; the first-run/empty experience guides to search.

**Packages touched:** `apps/movies` (+ a `watchlist_items` column for the pick)

---

## Phase 7 — App 2: Shared plans / events (`apps/plans`)

**Goal:** Second app — shared plans/events list, proving app-addition is trivial and the UI is identical.

**Prerequisite (✅ landed -- `decouple-app-schema-i18n`):** per-app schema types and i18n strings
are decoupled from the shared packages, so adding `apps/plans` no longer forces edits to them.
`@aca/core` now exports a cross-app `BaseDatabase` (`public` + `shared`) and a generic Supabase
client/hook; an app composes `<App>Database = BaseDatabase & { <schema>: ... }` for typed
`client.schema(...)`. `@aca/i18n` now has a `common` namespace + `fallbackNS` plus
`registerAppNamespace` / `useAppLocale(ns)`, so an app owns its namespace. See the "Adding an
app" recipe in `ARCHITECTURE.md`; `apps/movies` is the worked example. (Originally flagged in the
2026-05 review, when `packages/core/src/types.ts` hard-coded the `movies` schema.)

**Sequencing note:** the product review recommends shipping Phase 6.5 (a loved movies v1) and a
first release *before* App 2, so the second app builds on a validated pattern rather than
duplicating an unproven UX. Define the plans product shape (what a "plan/event" is) before scaffolding.

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

## Phase 11 - Over-the-air auto-update (no-touch updates)

**Goal:** The app updates itself on launch -- no app-store download or manual step for
either partner. Open the app, it fetches the latest and runs it.

**Investigation / tasks**
- Use `expo-updates` (OTA JS + asset bundle updates). On native, check on launch
  (`Updates.checkForUpdateAsync` / `fetchUpdateAsync`) then reload to apply (auto, or after
  a brief "updating" splash). Web is always-latest on each deploy.
- Self-hosted publishing: `expo-updates` speaks the Expo Updates protocol and can point at a
  **custom update server**, so updates can be hosted wherever the maintainer chooses (an
  open-source updates server or static host), not only EAS Update. Pick EAS Update vs.
  self-hosted and document the publish step.
- Configure `runtimeVersion` + the update URL/channel; handle the launch-check UX and the
  offline/failure fallback (run the cached bundle).
- **Boundary:** OTA ships only JS/asset changes. Native changes (new native modules, an Expo
  SDK bump) still need a fresh native build (EAS Build or a sideloaded APK/IPA); the matching
  `runtimeVersion` gates which builds an update applies to.

**Acceptance criteria**
- With a newer update published, launching the installed app fetches and applies it with no
  user action; an offline launch still runs the last good bundle.
- Native-level changes are documented as requiring a rebuild, and the publish flow is written
  down so the maintainer can ship updates unattended for the other partner.

**Packages touched:** `apps/movies` (+ `apps/plans`), release tooling

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
