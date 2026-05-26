# Monorepo Foundation

## Purpose

Establish a pnpm-workspaces + Turborepo monorepo with clear, lint-enforced boundaries: end-user apps under `apps/*`, shared libraries under `packages/*`, and a trivial path to add a new app without touching shared internals.

## Requirements

### Requirement: Workspace layout and package boundaries

The repository SHALL be a pnpm-workspaces + Turborepo monorepo with end-user apps under `apps/*` and shared libraries under `packages/*`. Apps MAY depend on packages; packages SHALL NOT depend on apps, and cross-package imports SHALL use workspace aliases rather than relative paths. The boundary SHALL be enforced by lint, not convention alone.

#### Scenario: Workspace resolves and builds

- **GIVEN** a fresh clone of the repository
- **WHEN** a contributor runs `pnpm install --frozen-lockfile` then `pnpm build`
- **THEN** the workspace SHALL resolve all `apps/*` and `packages/*` members
- **AND** the Turborepo task graph SHALL complete with exit code 0

#### Scenario: Cross-package relative import is rejected

- **GIVEN** a file in one package
- **WHEN** it imports another package via a relative path (e.g. `../../packages/core/src/...`)
- **THEN** `pnpm lint` SHALL fail with a boundary-violation error directing the author to the workspace alias

#### Scenario: App depending on packages is allowed

- **GIVEN** an app under `apps/*`
- **WHEN** it imports `@aca/ui`, `@aca/core`, `@aca/i18n`, or `@aca/config`
- **THEN** lint and typecheck SHALL pass

### Requirement: Trivial app addition

Adding a new app SHALL require only creating a folder under `apps/*` that consumes the shared packages, with no edits to shared package internals. The path to add an app SHALL be documented.

#### Scenario: New app scaffold integrates without touching shared packages

- **GIVEN** the documented "add an app" steps
- **WHEN** a new folder is created under `apps/*` consuming `@aca/ui`, `@aca/core`, `@aca/i18n`, and `@aca/config`
- **THEN** it SHALL be picked up by the workspace and Turborepo tasks
- **AND** no file under `packages/*` SHALL need modification for the app to build and run
