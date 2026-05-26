# CI

## Purpose

Run CI on GitHub Actions cost-effectively and safely: a reusable setup, SHA-pinned third-party actions, label-gated expensive jobs scoped to changed areas, and a single aggregate gate as the one required check.

## Requirements

### Requirement: Label-gated CI with an aggregate gate

CI SHALL run on GitHub Actions using a reusable composite `./.github/actions/setup-repo` (pnpm + Node + frozen install). All third-party actions SHALL be pinned to a commit SHA with a trailing version comment. Expensive jobs (e2e, full) SHALL be label-gated; `dorny/paths-filter` SHALL scope jobs to changed areas; a single aggregate `ci-gate` job SHALL be the required check and SHALL fail unless every needed job is `success` or `skipped`.

#### Scenario: Aggregate gate reflects job results

- **GIVEN** a pull request that triggers the configured jobs
- **WHEN** all required jobs finish
- **THEN** `ci-gate` SHALL pass only if each needed job is `success` or `skipped`
- **AND** if any needed job fails, `ci-gate` SHALL fail

#### Scenario: Actions are SHA-pinned

- **GIVEN** any workflow file
- **WHEN** it references a third-party action
- **THEN** the reference SHALL be a commit SHA with a version comment, not a floating tag

#### Scenario: Expensive jobs are gated

- **GIVEN** a pull request without an `ci:e2e` (or `ci:full`) label
- **WHEN** CI runs
- **THEN** the e2e jobs SHALL be skipped to conserve runner minutes
- **AND** adding the label SHALL enable them
