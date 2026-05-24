## ADDED Requirements

### Requirement: Shared lint, format, and type configuration

The repository SHALL provide shared `packages/eslint-config` (flat config: js + typescript-eslint + import-sort + cross-package boundary rule + `eslint-config-expo` layer) and `packages/typescript-config` (`base.json` strict + `react-native.json` variant), consumed by every workspace member. Prettier SHALL be the single formatter. TypeScript SHALL be strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).

#### Scenario: Lint and typecheck pass workspace-wide

- **GIVEN** the configured workspace
- **WHEN** `pnpm lint` and `pnpm typecheck` run
- **THEN** both SHALL complete with exit code 0 on clean code

#### Scenario: Format is enforced

- **GIVEN** an unformatted file
- **WHEN** `pnpm format:check` runs
- **THEN** it SHALL report the file as needing formatting and exit non-zero

### Requirement: Conventional commits and local gates

Commits SHALL follow Conventional Commits, enforced by commitlint via a Husky `commit-msg` hook with a `scope-enum` covering this repo's packages and apps. A `pre-commit` hook SHALL run lint-staged; a `pre-push` hook SHALL mirror the CI gates so a green push implies green CI.

#### Scenario: Non-conventional commit is rejected

- **GIVEN** a commit message that is not Conventional Commits format
- **WHEN** the `commit-msg` hook runs
- **THEN** commitlint SHALL reject it with the expected format

#### Scenario: Pre-push mirrors CI

- **GIVEN** local changes that would fail CI (lint/type/test/format)
- **WHEN** `git push` triggers the `pre-push` hook
- **THEN** the hook SHALL fail locally with the same failure CI would report
