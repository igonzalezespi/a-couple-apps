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
- [x] 3.5 Add a root `CLAUDE.md` (persona, proactive behaviors, coding standards, commands cheat-sheet, commit scopes, project knowledge pointers, tech stack) in the `a private TS monorepo` style
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

- [ ] 6.1 Set up i18next + react-i18next; add `locales/en.ts` and `locales/es.ts` resource bundles with a shared key namespace
- [ ] 6.2 Implement language resolution (user setting → `couple.config.defaultLanguage` → `expo-localization` device locale → `en`) and a `useLocale()` hook for runtime switching
- [ ] 6.3 Implement `resolveExternalLang(lang)` mapping (`en`→`en-US`, `es`→`es-ES`) for external data providers (TMDB)
- [ ] 6.4 Unit-test resolution precedence and external-language mapping; add a missing-translation-key guard test. Acceptance: switching language updates strings; `resolveExternalLang('es') === 'es-ES'`

## 7. `packages/core` — Supabase, auth, realtime, query

- [ ] 7.1 Create the Supabase client (reads `SUPABASE_URL`/`SUPABASE_ANON_KEY` via `@aca/config` env), typed for the project
- [ ] 7.2 Add auth hooks (session, sign-in/out) and a `QueryClient` provider; define base zod contracts in `core/src/contracts.ts`
- [ ] 7.3 Add a realtime helper that subscribes to a couple-scoped channel and invalidates/updates the TanStack Query cache so both users stay in sync
- [ ] 7.4 Add Supabase migrations layout (`supabase/migrations/`) — one project; `shared` schema + auth/realtime plumbing only (per-app schemas `movies`/`plans` ship with their app changes)
- [ ] 7.5 Unit-test the env-wiring and contract parsing with a mocked Supabase client; test the realtime→cache invalidation handler. Acceptance: `pnpm --filter @aca/core test` green; apps never import `@supabase/supabase-js` directly (lint boundary)

## 8. Testing harness

- [ ] 8.1 Configure Vitest at root + per-package (RN test env / jsdom for web), aliases to `packages/*/src`, coverage (v8) thresholds (global 80, critical packages 85) and `type-coverage --at-least 95`
- [ ] 8.2 Add `@testing-library/react-native` setup and shared test-utils in a `packages/*/test-utils` or `core` test-utils export
- [ ] 8.3 Add Playwright (`e2e/`) config targeting the exported/served RN-Web build; add a smoke spec placeholder (no app yet → asserts the dev shell renders)
- [ ] 8.4 Add Maestro (`.maestro/`) with a smoke flow placeholder and a documented local run command. Acceptance: `pnpm test` (unit/component) green with coverage gate; `pnpm e2e` web smoke green; Maestro flow documented and runnable locally

## 9. CI spine

- [ ] 9.1 Add composite `./.github/actions/setup-repo` (pnpm + Node 24 + `pnpm install --frozen-lockfile`)
- [ ] 9.2 Add `.github/workflows/quality-gates.yml`: `concurrency`, `dorny/paths-filter`, label-gate (`ci:*`), parallel `lint`/`typecheck`/`test`, then `build`, then label-gated `e2e`/`web-e2e`, then an aggregate `ci-gate` job (`if: always()`) that fails unless all needed jobs are `success`/`skipped`
- [ ] 9.3 Add `.github/workflows/release.yml` (tag `v*` → EAS build placeholder + changelog check) and `.github/PULL_REQUEST_TEMPLATE.md` (strict schema composed by `/opsx:archive`)
- [ ] 9.4 SHA-pin every third-party action with a trailing version comment; add `renovate.json` (grouped, pinDigests, lockFileMaintenance). Acceptance: a sample PR runs the gate; `ci-gate` is the single required check; pre-push mirrors the gate locally

## 10. Open-source hygiene

- [ ] 10.1 Add `LICENSE` (MIT + author attribution) and per-repo attribution in `README.md`
- [ ] 10.2 Write `README.md` (what it is, screenshots placeholder, quick start, "Fork this for your own couple" clone→configure flow), `CONTRIBUTING.md` (spec-driven workflow, commands, commit rules), `ARCHITECTURE.md` (this design distilled), `CHANGELOG.md` (Keep a Changelog `[Unreleased]`)
- [ ] 10.3 Add `docs/decisions/` (MADR template + ADR-0001 recording the foundation stack) and `docs/kb/` index
- [ ] 10.4 Acceptance: a fresh clone following README reaches a running web dev shell with placeholder config and no secrets committed (gitleaks clean)

## 11. Validation & verification

- [ ] 11.1 Run `pnpm preflight` (format:check + lint + typecheck + test + build) green
- [ ] 11.2 Run `openspec validate bootstrap-foundation` (or the ported equivalent) and the opsx linters against this change's artifacts
- [ ] 11.3 Confirm `.opsx-state.json` lifecycle fields are consistent and `/osx:review` has run before `/opsx:apply` per `project.md` policy

## Out of Scope

- **End-user apps** — the movie-watchlist (`apps/movies`) and plans/events (`apps/plans`) apps; separate changes after the foundation. See design.md §Non-Goals.
- **Per-app Supabase schemas** — schemas beyond the `shared` schema + auth/realtime plumbing. See design.md §Non-Goals.
- **Unused reference-repo automation** — Flutter/Dart lint gates, container/trivy/sbom/lighthouse/oss-validation CI jobs, npm publish + provenance, Stryker mutation testing. See design.md §D8.
- **App-store submission automation** — EAS build only; store submit manual/later. See design.md §Non-Goals.
- **Offline-first sync** — CRDT semantics beyond Supabase realtime. See design.md §Non-Goals.
