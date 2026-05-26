## ADDED Requirements

### Requirement: Open-source licensing and documentation

The repository SHALL ship an MIT `LICENSE` with author attribution, and the documentation set `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` (Keep a Changelog format). All documentation SHALL be in English.

#### Scenario: License and core docs present

- **GIVEN** the repository root
- **WHEN** it is inspected
- **THEN** `LICENSE` (MIT, with the author's copyright line), `README.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, and `CHANGELOG.md` SHALL all be present

### Requirement: Fork-for-your-own-couple flow

The README SHALL document a clone-and-configure flow that lets anyone run the apps for their own couple without editing source beyond configuration: copy `couple.config.example.ts` → `couple.config.ts`, copy `.env.example` → `.env`, fill in their two people, language, and secrets.

#### Scenario: Documented flow yields a running app

- **GIVEN** a fresh clone and the README "Fork this for your own couple" steps
- **WHEN** a forker copies the example config and env, fills in their values, and runs the documented dev command
- **THEN** a web dev shell SHALL start using their configuration
- **AND** no personal data or secrets from the upstream author SHALL be present
