## ADDED Requirements

### Requirement: Activity-driven, non-blocking weekly coverage

The repository SHALL run test coverage as a **separate, non-blocking** workflow
(`.github/workflows/coverage.yml`), distinct from the required `ci-gate`. The workflow SHALL
trigger on `push` to `develop` and `workflow_dispatch`, declare a top-level `concurrency`
group keyed on the ref with cancel-in-progress, and request `contents: read` plus
`actions: read` permissions. A `gate` job SHALL use the shared `coverage-stale-gate`
composite action (SHA-pinned) to throttle execution to at most one run per 7 days by
inspecting this workflow's own run history; a `coverage` job SHALL run only when the gate
reports the last run is stale. Both jobs SHALL run on GitHub-hosted `ubuntu-latest` runners
(never self-hosted, per the public-repo policy). The coverage run SHALL be `continue-on-error`
and SHALL NOT be listed in `ci-gate`'s `needs`, so it can never block a pull request. Coverage
SHALL be produced with the Vitest v8 provider emitting an **lcov** report per workspace
package, and the reports SHALL be published **without any secret** — as a CI artifact rather
than an upload requiring a token.

#### Scenario: Coverage is throttled to weekly

- **GIVEN** a successful coverage run on `develop` less than 7 days ago
- **WHEN** a new push to `develop` triggers the coverage workflow
- **THEN** the `gate` job SHALL report the run is not stale
- **AND** the `coverage` job SHALL be skipped

#### Scenario: Coverage never blocks a pull request

- **GIVEN** the coverage workflow and the `quality-gates` workflow
- **WHEN** a pull request runs
- **THEN** `ci-gate` SHALL NOT depend on the coverage workflow or job
- **AND** a coverage failure SHALL NOT affect the required check's result

#### Scenario: Coverage reports are published without a secret

- **GIVEN** a coverage run that produces a per-package lcov report
- **WHEN** the workflow publishes the results
- **THEN** the lcov reports SHALL be uploaded as a build artifact
- **AND** the workflow SHALL NOT reference any repository secret (no `CODECOV_TOKEN` or other)

#### Scenario: Coverage is SHA-pinned and reuses the setup composite

- **GIVEN** the coverage workflow
- **WHEN** it references third-party actions and sets up the repo
- **THEN** every third-party action SHALL be a commit SHA with a version comment
- **AND** the `coverage` job SHALL set up the repo via `./.github/actions/setup-repo`
