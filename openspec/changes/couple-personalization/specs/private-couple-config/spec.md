## ADDED Requirements

### Requirement: Real config is private to each instance

The repository SHALL NOT track a `couple.config.ts` containing real data: `couple.config.ts` SHALL be gitignored (per-instance), and `couple.config.example.ts` SHALL be the committed template carrying only neutral placeholders. A check SHALL assert the committed template contains no real personal data.

#### Scenario: Only the template is in source

- **GIVEN** the repository
- **WHEN** tracked files are inspected
- **THEN** `couple.config.ts` SHALL NOT be tracked
- **AND** `couple.config.example.ts` SHALL be present with placeholder people only

#### Scenario: Instance fills a private config

- **GIVEN** a fresh clone
- **WHEN** the maintainer copies the example to `couple.config.ts` and sets real names + colors
- **THEN** those values SHALL drive the running instance
- **AND** SHALL NOT be committed (the file is gitignored)

#### Scenario: Tooling runs without a private config

- **GIVEN** a checkout with no local `couple.config.ts`
- **WHEN** CI or tests run
- **THEN** the example SHALL be used (copied in setup, or read directly by the personal-data check)
- **AND** the build/tests SHALL NOT require real personal data
