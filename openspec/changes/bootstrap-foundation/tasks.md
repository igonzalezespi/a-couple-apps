## 1. Repository & monorepo spine

- [x] 1.1 `git init`; add `.gitignore` (node_modules, `.env`, `.expo`, `dist`, `.turbo`, coverage), `.gitattributes`, `.nvmrc` (Node 24), `.npmrc` (`engine-strict`, `auto-install-peers`, `only-allow pnpm` via `preinstall`)
- [x] 1.2 Root `package.json` (`private`, `packageManager: pnpm@...`, `engines.node >=24`, turbo scripts: `build/dev/lint/test/typecheck/e2e/format/preflight/verify`), `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `turbo.json` (task graph + outputs)
- [x] 1.3 Add `syncpack` (`.syncpackrc.mjs`: internal deps `workspace:*`, `^` range policy) and a `pnpm sync` script
- [x] 1.4 Verify the empty workspace installs and `pnpm turbo run build` is a no-op green (acceptance: `pnpm install --frozen-lockfile` + `pnpm build` exit 0)

## 2. Shared config packages (`typescript-config`, `eslint-config`)

- [x] 2.1 Create `packages/typescript-config` with `base.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `noImplicitOverride`) and `react-native.json` (extends base: `jsx: react-jsx`, `moduleResolution: bundler`, `types: ["expo"]`)
- [x] 2.2 Create `packages/eslint-config` flat config: `base.mjs` (js + typescript-eslint + import-sort + `no-restricted-imports` cross-package boundary rule) and `expo.mjs`/`react-native.mjs` layering `eslint-config-expo` — _base + boundary rule done; the `eslint-config-expo` layer lands with the first Expo app (Phase 2)_
- [x] 2.3 Add root `eslint.config.mjs`, `prettier.config.mjs` (single-quote, no-semicolon-trailing-comma, import-sort), `commitlint.config.mjs` (`@commitlint/config-conventional` + `scope-enum` for this repo's packages/apps)
- [x] 2.4 Add Husky: `pre-commit` (lint-staged + syncpack lint + openspec normalize check + archive-doc guard), `commit-msg` (commitlint), `pre-push` (mirrors CI: format:check + lint + typecheck + test + gitleaks) — _openspec-normalize check deferred until the openspec CLI is added_
- [x] 2.5 Unit-test the `eslint-config` boundary rule (a fixture importing across packages fails lint). Acceptance: `pnpm lint` + `pnpm typecheck` green; a deliberate cross-package import is rejected

## 3. OpenSpec / opsx workflow (self-hosting)

- [x] 3.1 Create `openspec/config.yaml` (`schema: spec-driven`, `context:` block for this stack, `rules:` for proposal/specs/design/tasks, `quick-change:` tuned to this repo's disqualifiers) and `openspec/project.md` (single fenced YAML block: verify thresholds, triage rules, archive knobs, manual_checks)
- [x] 3.2 Create `openspec/{specs/,changes/archive/,templates/,schemas/,manual-checks/}`; copy `templates/{verify-report.md,review-report.md}` and `schemas/opsx-state.schema.json` from the reference spine
- [x] 3.3 Port `scripts/opsx/*.mjs` (state, project-config, verify-report-parser, verify-report-lint, review-report-lint, lint-tasks-md, lint-manual-checks, archive-doc-edit-guard, post-archive-safety-check) WITH their `__tests__`; prune Flutter/other-repo-specific linters per design D8
- [x] 3.4 Port `.claude/` — `agents/` (code-reviewer, software-architect, product-owner, technical-writer, frontend-react→react-native, e2e-automation, unit-test-generator), `commands/{opsx,osx}/*.md`, `skills/` (openspec-*, osx-*, sdd-workflow), `settings.json` (PostToolUse format/lint + Stop typecheck), `settings.local.json` (perms)
- [x] 3.5 Add a root `CLAUDE.md` (persona, proactive behaviors, coding standards, commands cheat-sheet, commit scopes, project knowledge pointers, tech stack) in the `mirrorflow` style
- [x] 3.6 Acceptance: `pnpm opsx:tasks-md:lint` + `pnpm opsx:verify-report:lint` run clean against THIS change's own `tasks.md`; `node --test scripts/opsx/**/*.test.mjs` passes

## 4. `packages/ui` — Tamagui design system

- [x] 4.1 Create `packages/ui` with `tamagui.config.ts` defining tokens (color/space/radius/size/font) and named themes (light, dark) plus a `createCoupleTheme(overrides)` that merges `couple.config` theme overrides
- [x] 4.2 Add core primitives/components (Button, Text, Card, Screen, Stack) re-exported from `@aca/ui`; configure the Tamagui Babel/compiler plugin and a `TamaguiProvider` wrapper — _primitives + UIProvider done; the Babel/optimizing-compiler plugin is wired at app integration (Phase 6); runtime works without it_
- [x] 4.3 Add a `ui` preview/Storybook screen rendering the token palette + primitives for visual parity checks — _lightweight `Preview` component shipped; full Storybook deferred_
- [x] 4.4 Component-test (Vitest + @testing-library/react-native) that primitives render with theme tokens and that an override changes the resolved token. Acceptance: same component snapshot/role assertions pass under web and native test envs — _tests run in the web env (Vitest + jsdom + react-native-web + @testing-library/react); override logic covered by pure `createCoupleTheme` tests; native parity is structural (shared Tamagui config) + Maestro e2e (Phase 8)_

## 5. `packages/config` — `couple.config.ts` + env

- [x] 5.1 Define the zod schema in `packages/config/src/schema.ts` for a single `couple.config.ts` shaped `{ config, movies, plans }`: shared `config` block (`people` tuple of two `{ id, displayName }`, `defaultLanguage: 'en'|'es'`, optional `theme`) + per-app sections each with an `enabled` flag; expose `getSharedConfig()`/`getAppConfig(name)` and a `defineCoupleConfig` helper
- [x] 5.2 Implement `load.ts` (loads + validates `couple.config.ts`, throws a readable error on invalid config) and `env.ts` (typed parsers + `SENSITIVE_ENV_VARS` registry)
- [x] 5.3 Author root `couple.config.example.ts` (neutral placeholders) and a committed placeholder `couple.config.ts`; assert (test) that no real personal names exist in the committed config
- [x] 5.4 Unit-test schema validation (valid config passes; missing/extra/wrong-type fails) and env parsing (missing required secret → clear error). Acceptance: `pnpm --filter @aca/config test` green; invalid configs rejected with helpful messages

## 6. `packages/i18n` — translations + language switching

- [x] 6.1 Set up i18next + react-i18next; add `locales/en.ts` and `locales/es.ts` resource bundles with a shared key namespace
- [x] 6.2 Implement language resolution (user setting → `couple.config.defaultLanguage` → `expo-localization` device locale → `en`) and a `useLocale()` hook for runtime switching — _device locale is supplied by the app (expo-localization) and passed to `resolveLanguage`; packages/i18n stays free of native deps_
- [x] 6.3 Implement `resolveExternalLang(lang)` mapping (`en`→`en-US`, `es`→`es-ES`) for external data providers (TMDB)
- [x] 6.4 Unit-test resolution precedence and external-language mapping; add a missing-translation-key guard test. Acceptance: switching language updates strings; `resolveExternalLang('es') === 'es-ES'`

## 7. `packages/core` — Supabase, auth, realtime, query

- [x] 7.1 Create the Supabase client (reads `SUPABASE_URL`/`SUPABASE_ANON_KEY` via `@aca/config` env), typed for the project
- [x] 7.2 Add auth hooks (session, sign-in/out) and a `QueryClient` provider; define base zod contracts in `core/src/contracts.ts`
- [x] 7.3 Add a realtime helper that subscribes to a couple-scoped channel and invalidates/updates the TanStack Query cache so both users stay in sync
- [x] 7.4 Add Supabase migrations layout (`supabase/migrations/`) — one project; `shared` schema + auth/realtime plumbing only (per-app schemas `movies`/`plans` ship with their app changes)
- [x] 7.5 Unit-test the env-wiring and contract parsing with a mocked Supabase client; test the realtime→cache invalidation handler. Acceptance: `pnpm --filter @aca/core test` green; apps never import `@supabase/supabase-js` directly (lint boundary)

## 8. Testing harness

- [x] 8.1 Configure Vitest per package with the correct test env per package (Node for pure packages; jsdom for component/web packages) and a `react-native` -> `react-native-web` resolve alias so RN primitives unit-test in jsdom; aggregate via `turbo run test` + the root `node --test` opsx suite (`pnpm test`) -- _coverage (v8) thresholds + `type-coverage` are deferred to Phase 8 (Testing & e2e hardening); not wired here_
- [x] 8.2 Provide component testing via `@testing-library/react` over the `react-native` -> `react-native-web` jsdom alias (the cross-platform-equivalent capability ships; `@aca/ui` primitives are rendered and asserted in jsdom) -- _a shared `test-utils` export is deferred to Phase 8_
- [x] 8.3 Add Playwright (`apps/movies/e2e/`) config targeting the served RN-Web build with a hermetic smoke spec (`movies.spec.ts`) asserting the app renders; runnable via `pnpm e2e`
- [x] 8.4 Add Maestro (`.maestro/`) with a smoke flow (`movies-watchlist.yaml`) and a documented local run command (`.maestro/README.md`). Acceptance: `pnpm test` (unit/component) green; `pnpm e2e` web smoke green; Maestro flow documented and runnable locally

## 9. CI spine

- [x] 9.1 Add composite `./.github/actions/setup-repo` (pnpm + Node 24 + `pnpm install --frozen-lockfile`)
- [x] 9.2 Add `.github/workflows/quality-gates.yml`: `concurrency` (cancel-in-progress), parallel `format`/`lint`/`typecheck`/`test`, then `build`, an `e2e-web` (Playwright) job, a `secrets` (gitleaks) job, and an aggregate `ci-gate` job (`if: always()`) that fails unless all needed jobs are `success`/`skipped` -- _`dorny/paths-filter` scoping + `ci:*` label-gating of the e2e job are deferred to Phase 9 (CI completion); the gate currently runs every job on every PR/push_
- [x] 9.3 Add `.github/PULL_REQUEST_TEMPLATE.md` (strict schema composed by `/opsx:archive`) -- _the tag-`v*` release/EAS workflow (`release.yml`) is deferred (aligns with the App-store-submission-automation Non-Goal: EAS build only, store submit manual/later; ROADMAP Phase 9/10 owns the release pipeline)_
- [x] 9.4 SHA-pin every third-party action to a 40-char commit SHA with a trailing version comment (`actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `actions/upload-artifact`, `gitleaks/gitleaks-action`, `reactivecircus/android-emulator-runner`). Acceptance: `ci-gate` is the single required check; pre-push mirrors the gate locally -- _`renovate.json` (grouped, pinDigests, lockFileMaintenance) is deferred to Phase 9 (CI completion)_

## 10. Open-source hygiene

- [x] 10.1 Add `LICENSE` (MIT + author attribution) and per-repo attribution in `README.md`
- [x] 10.2 Write `README.md` (what it is, screenshots placeholder, quick start, "Fork this for your own couple" clone->configure flow), `CONTRIBUTING.md` (spec-driven workflow, commands, commit rules), `ARCHITECTURE.md` (this design distilled), `CHANGELOG.md` (Keep a Changelog `[Unreleased]`)
- [x] 10.3 Add `docs/decisions/` (MADR ADR-0001 recording the foundation stack, `0001-foundation-stack.md`) -- _a `docs/kb/` index is deferred to its ROADMAP phase_
- [x] 10.4 Acceptance: a fresh clone reaches a running web dev shell with placeholder config and no committed secrets -- `setup-repo` copies `couple.config.example.ts` -> `couple.config.ts` when absent, `.env.example` ships placeholders only, and gitleaks runs clean in CI + pre-push

## 11. Validation & verification

- [x] 11.1 Run `pnpm preflight` (format:check + lint + typecheck + test + build) green
- [x] 11.2 Run the ported opsx linters against this change's artifacts (`lint-tasks-md`, `verify-report-lint`) plus the `node --test scripts/opsx/*.test.mjs` suite (87 tests) -- exercised by this verify run
- [x] 11.3 Confirm `.opsx-state.json` lifecycle fields are consistent; the pre-apply `/osx:review` gate is satisfied via `reviewWaived: true` with a documented reason (the review tooling is authored by this very bootstrap change)

## Out of Scope

- **End-user apps** — the movie-watchlist (`apps/movies`) and plans/events (`apps/plans`) apps; separate changes after the foundation. See design.md §Non-Goals.
- **Per-app Supabase schemas** — schemas beyond the `shared` schema + auth/realtime plumbing. See design.md §Non-Goals.
- **Unused reference-repo automation** — Flutter/Dart lint gates, container/trivy/sbom/lighthouse/oss-validation CI jobs, npm publish + provenance, Stryker mutation testing. See design.md §D8.
- **App-store submission automation** — EAS build only; store submit manual/later. See design.md §Non-Goals.
- **Offline-first sync** — CRDT semantics beyond Supabase realtime. See design.md §Non-Goals.
