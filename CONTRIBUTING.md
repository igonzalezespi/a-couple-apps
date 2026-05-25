# Contributing

Thanks for your interest. This repo is the open-source **code** for A Couple Apps; each
couple runs their **own** private instance (see the README). So "contributing" means
improving the shared foundation and the apps -- not changing anyone's running instance. To
use the apps yourself, fork and self-host.

## Ground rules

- **English only** in code, comments, docs, and commits. UI strings are translatable
  (en/es) via `@aca/i18n` -- never hard-code user-facing text.
- **Plain ASCII** in source and docs (Spanish accents in `packages/i18n` locale files are
  legitimate content).
- **Zero personal data in source.** Names, language, and theme live only in
  `couple.config.ts`; upstream ships neutral placeholders.
- **Secrets only in `.env`** (gitignored): `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `TMDB_API_KEY`. Never commit them. A `pre-push` gitleaks hook is the backstop.
- **All styling comes from `@aca/ui`** (Tamagui tokens/themes) -- no ad-hoc colors or
  spacing in apps, so both apps stay identical.
- **Only `packages/core` imports `@supabase/supabase-js`.** Apps use `@aca/core` hooks; a
  lint boundary enforces this.
- **The configured language drives external data too** (TMDB locale via `@aca/i18n`
  `resolveExternalLang`).

## Getting set up

Follow the README [Quick start](README.md#quick-start). For the backend, see
[Self-hosting your own instance](README.md#self-hosting-your-own-instance) -- contributors
test against their own Supabase project. The Playwright web e2e is hermetic (it stubs
Supabase and TMDB), so it needs no project or secrets.

## Spec-driven development (OpenSpec)

Every non-trivial change is documented before code, as an OpenSpec change under
`openspec/changes/<name>/`:

```
proposal.md  ->  design.md  ->  tasks.md  ->  delta specs  ->  review  ->  apply  ->  verify  ->  archive (PR)
```

- Canonical specs live in `openspec/specs/`; proposals and per-change artifacts in
  `openspec/changes/`. Thresholds and workflow rules are in `openspec/project.md` and
  `openspec/config.yaml`.
- Lifecycle state per change is tracked in `.opsx-state.json`; `/opsx:verify` writes a
  schema-linted `verify-report.md` that `/opsx:archive` consumes.
- Helpers: `node scripts/opsx/<script>.mjs` (e.g. `lint-tasks-md`, `verify-report-lint`).

If you are using Claude Code, the `/opsx:*` skills drive this workflow; otherwise follow
the artifacts by hand.

## Branching and commits

- Branch from `main`, no tracking: `git checkout -b feat/<change-name> --no-track origin/main`.
- **Conventional Commits**, lowercase subject: `type(scope): description`.
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`.
  - Scopes: `ui`, `config`, `i18n`, `core`, `eslint-config`, `typescript-config`, `movies`,
    `plans`, `openspec`, `ci`, `docs`, `deps`.
- `commitlint` (commit-msg hook) and `lint-staged` (pre-commit) run automatically.

## Quality gate

Before pushing, the full gate must pass -- it is also what `pre-push` mirrors:

```bash
pnpm preflight   # format:check -> lint -> typecheck -> test -> build
```

- **Unit/component:** Vitest + Testing Library, beside the source (`*.test.ts(x)`).
- **Web e2e:** Playwright in `apps/*/e2e/` (`pnpm e2e`). Hermetic -- intercepts Supabase and
  TMDB, so it runs with no secrets. CI needs `pnpm --filter <app> exec playwright install --with-deps chromium`.
- **Native e2e:** Maestro flows in `.maestro/` run on a local simulator/emulator and, in CI,
  only when a `ci:e2e-native` label is present (see ROADMAP Phase 9).

## Code style

- Early returns and guard clauses; avoid deep nesting.
- Descriptive names (`isLoading`, not `flag`).
- Comments explain **why**, not **what**.
- Look up unfamiliar libs/APIs rather than guessing.

## Pull requests

- Target `main`. Fill in the PR template.
- CI is label-gated with an aggregate `ci-gate` as the single required check; expensive jobs
  (e.g. native e2e) skip without their `ci:*` label and still let `ci-gate` pass.
- Keep changes scoped to one OpenSpec change where practical, and make sure
  `tasks.md` reflects what landed.
