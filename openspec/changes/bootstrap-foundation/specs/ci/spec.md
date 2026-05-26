## ADDED Requirements

### Requirement: Label-gated CI with an aggregate gate

CI SHALL run on GitHub Actions using a reusable composite `./.github/actions/setup-repo` (pnpm + Node + frozen install). All third-party actions SHALL be pinned to a commit SHA with a trailing version comment. CI SHALL run `format`, `lint`, `typecheck`, and `test` in parallel, then `build`, an `e2e-web` (Playwright) job, and a `secrets` (gitleaks) job; a single aggregate `ci-gate` job SHALL be the required check and SHALL fail unless every needed job is `success` or `skipped`. (`dorny/paths-filter` job scoping and label-gating of expensive jobs are out of scope for the foundation; see ROADMAP Phase 9.)

#### Scenario: Aggregate gate reflects job results

- **GIVEN** a pull request that triggers the configured jobs
- **WHEN** all required jobs finish
- **THEN** `ci-gate` SHALL pass only if each needed job is `success` or `skipped`
- **AND** if any needed job fails, `ci-gate` SHALL fail

#### Scenario: Actions are SHA-pinned

- **GIVEN** any workflow file
- **WHEN** it references a third-party action
- **THEN** the reference SHALL be a commit SHA with a version comment, not a floating tag
