## ADDED Requirements

### Requirement: Secrets separated from config and never committed

Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TMDB_API_KEY`) SHALL live in `.env` (gitignored), with a committed `.env.example` containing placeholders only. Client-exposed values SHALL use the `EXPO_PUBLIC_*` convention. `packages/config` SHALL expose typed env parsers and a `SENSITIVE_ENV_VARS` registry; secret values SHALL never be logged.

#### Scenario: Example env ships placeholders only

- **GIVEN** the committed `.env.example`
- **WHEN** it is inspected
- **THEN** it SHALL list every required variable with a placeholder value
- **AND** no real secret value SHALL be present

#### Scenario: Missing required secret fails fast

- **GIVEN** a `.env` missing `SUPABASE_ANON_KEY`
- **WHEN** the env parser runs at startup
- **THEN** it SHALL throw an error naming the missing variable
- **AND** the failure SHALL occur before any network call is attempted

### Requirement: Secret scanning in the pipeline

Secret scanning (gitleaks) SHALL run in the pre-push hook and in CI to prevent committed secrets.

#### Scenario: Committed secret is blocked

- **GIVEN** a staged change containing a value matching a secret pattern
- **WHEN** the pre-push hook or CI secret-scan runs
- **THEN** it SHALL fail and block the push/merge
