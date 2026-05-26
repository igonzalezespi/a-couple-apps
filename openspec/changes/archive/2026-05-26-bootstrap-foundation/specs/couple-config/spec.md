## ADDED Requirements

### Requirement: Typed root configuration

The repository SHALL provide a single root `couple.config.ts` validated by a zod schema in `packages/config`, shaped as `{ config: <shared>, movies: <app>, plans: <app> }`. The `config` (shared) block SHALL define the two people (each `{ id, displayName }`), `defaultLanguage` (`'en' | 'es'`), and optional `theme` overrides. Each app section SHALL carry that app's own settings plus an `enabled` flag. `@aca/config` SHALL validate the shared block strictly and expose typed accessors for the shared block and for each app's section. The loader SHALL fail with a readable error when the config is invalid.

#### Scenario: Valid config loads

- **GIVEN** a `couple.config.ts` matching the schema
- **WHEN** `@aca/config`'s loader runs
- **THEN** it SHALL return a typed config object
- **AND** consuming code SHALL get full type inference for the shared block and for each app's section

#### Scenario: Invalid config is rejected with a helpful message

- **GIVEN** a `couple.config.ts` missing a required field or using a wrong type
- **WHEN** the loader validates it
- **THEN** validation SHALL throw an error naming the offending field and expected type
- **AND** the app SHALL NOT start with an invalid config

#### Scenario: Per-app config is typed and toggled

- **GIVEN** a `couple.config.ts` with a `movies` section where `enabled: false`
- **WHEN** code calls `getAppConfig('movies')`
- **THEN** it SHALL return the typed `movies` config including `enabled: false`
- **AND** the app shell SHALL treat the movies app as disabled

### Requirement: Zero personal data in source

No personal data SHALL appear anywhere in source except `couple.config.ts`. The upstream repository SHALL ship neutral placeholder values (e.g. `personA` / `personB`), and a documented `couple.config.example.ts` template SHALL exist.

#### Scenario: Placeholders only in committed config

- **GIVEN** the committed `couple.config.ts` and `couple.config.example.ts`
- **WHEN** the repository is searched for personal names
- **THEN** only neutral placeholders SHALL be present
- **AND** a test SHALL assert that known personal names do not appear in tracked source

#### Scenario: Forker configures their own couple

- **GIVEN** a fresh clone
- **WHEN** a forker copies `couple.config.example.ts` to `couple.config.ts` and fills in their two people and language
- **THEN** both apps SHALL use those values with no other source edits
