## ADDED Requirements

### Requirement: Label-driven release on the develop->main merge

The repository SHALL cut a release on the `develop`->`main` merge (a `push` to `main`), driven by
exactly one `semver:*` label per merged PR. A `.github/workflows/release.yml` workflow SHALL run on
`push` to `main` and `workflow_dispatch`, with a top-level `concurrency` block and
`permissions: { contents: write, pull-requests: read }`. It SHALL read the current version from the
root `package.json`, then compute the next semver from the highest `semver:*` label across the PRs
merged since the last release tag using the studio's shared, SHA-pinned `compute-release-version`
action. When a release is due, it SHALL apply the version with the shared `apply-version` action
using `kind: expo` (writing the root `package.json` AND `apps/movies/app.config.ts`), promote the
CHANGELOG `[Unreleased]` section with the shared `changelog-release` action, commit
`chore(release): vX.Y.Z`, create and push a `vX.Y.Z` tag, and create a GitHub Release. When the
computed bump is `none`, it SHALL be a logged no-op with no commit, tag, or Release. The release
SHALL use only the automatic `GITHUB_TOKEN`. For aca specifically the release SHALL NOT build,
export, publish via EAS, submit to any store, set a build number, or reference any secret.

#### Scenario: A labeled merge cuts a release

- **GIVEN** PRs merged into `develop` since the last release tag, each carrying exactly one `semver:*` label
- **WHEN** the `develop`->`main` merge pushes to `main`
- **THEN** the next version SHALL be computed from the highest `semver:*` label
- **AND** the version SHALL be written to the root `package.json` AND `apps/movies/app.config.ts`
- **AND** the CHANGELOG `[Unreleased]` section SHALL be promoted to a `vX.Y.Z` heading
- **AND** a `chore(release): vX.Y.Z` commit, a `vX.Y.Z` tag, and a GitHub Release SHALL be created

#### Scenario: No release when the bump is none

- **GIVEN** the highest computed bump across the in-range PRs is `none`
- **WHEN** the release workflow runs
- **THEN** it SHALL log a no-op
- **AND** it SHALL NOT create a commit, tag, or Release

#### Scenario: aca releases never build, publish, or use secrets

- **GIVEN** the aca release workflow
- **WHEN** it runs to completion for any bump
- **THEN** it SHALL NOT run any build, `expo export`, EAS, OTA, or store-submit step
- **AND** it SHALL NOT set a build number
- **AND** it SHALL use only the automatic `GITHUB_TOKEN` and reference no other secret

### Requirement: Advisory require-semver-label PR gate

The repository SHALL include a `.github/workflows/require-semver-label.yml` PR check on pull
requests into `develop` (`opened`, `labeled`, `unlabeled`, `synchronize`) with a top-level
`concurrency` block. The check SHALL pass if and only if exactly one `semver:*` label
(`semver:major`, `semver:minor`, `semver:patch`, or `semver:none`) is present, and otherwise SHALL
fail with a message naming the required labels. This check SHALL be its own status and SHALL NOT be
listed in `ci-gate`'s `needs`; making it a required check is a separate branch-protection decision.

#### Scenario: Exactly one semver label passes

- **GIVEN** a pull request into `develop`
- **WHEN** it carries exactly one `semver:*` label
- **THEN** the require-semver-label check SHALL pass

#### Scenario: Zero or multiple semver labels fail

- **GIVEN** a pull request into `develop`
- **WHEN** it carries zero `semver:*` labels or more than one
- **THEN** the require-semver-label check SHALL fail with a message naming the required labels
- **AND** the check SHALL NOT be part of `ci-gate`'s `needs`
