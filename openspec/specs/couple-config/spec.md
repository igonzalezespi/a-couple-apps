# Couple Config

## Purpose

Provide a single, typed, per-instance configuration file that drives both apps -- the two people (each with an optional favorite accent color), the default language, and optional theme overrides -- without editing source. Real config is private to each instance: `couple.config.ts` is gitignored, and the committed `couple.config.example.ts` ships only neutral placeholders, so no personal data ever enters source.

## Requirements

### Requirement: Typed root configuration

The repository SHALL provide a single root `couple.config.ts` validated by a zod schema in `packages/config`, shaped as `{ config: <shared>, movies: <app>, plans: <app> }` (the `plans` section is forward-looking; `apps/plans` ships in Phase 7). The `config` (shared) block SHALL define the two people (each `{ id, displayName, color? }` where `color` is an optional favorite accent of `'red' | 'purple'`), `defaultLanguage` (`'en' | 'es'`), and optional `theme` overrides. Each app section SHALL carry that app's own settings plus an `enabled` flag. `@aca/config` SHALL validate the shared block strictly and expose typed accessors for the shared block and for each app's section. The loader SHALL fail with a readable error when the config is invalid.

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

#### Scenario: A person may declare a favorite color

- **GIVEN** a `couple.config.ts` where a person has `color: 'red'`
- **WHEN** the config is validated
- **THEN** that person's `color` SHALL be accepted as `'red'`
- **AND** omitting `color` SHALL be valid (the field is optional)

### Requirement: Real config is private to each instance

The repository SHALL NOT track a `couple.config.ts` containing real data: `couple.config.ts` SHALL be gitignored (per-instance), and `couple.config.example.ts` SHALL be the committed template carrying only neutral placeholders (e.g. `personA` / `personB`). A check SHALL assert the committed template contains no real personal data.

#### Scenario: Only the template is in source

- **GIVEN** the repository
- **WHEN** tracked files are inspected
- **THEN** `couple.config.ts` SHALL NOT be tracked
- **AND** `couple.config.example.ts` SHALL be present with placeholder people only
- **AND** a test SHALL assert that known personal names do not appear in tracked source

#### Scenario: Instance fills a private config

- **GIVEN** a fresh clone
- **WHEN** the maintainer copies the example to `couple.config.ts` and sets real names + colors
- **THEN** those values SHALL drive the running instance with no other source edits
- **AND** SHALL NOT be committed (the file is gitignored)

#### Scenario: Tooling runs without a private config

- **GIVEN** a checkout with no local `couple.config.ts`
- **WHEN** CI or tests run
- **THEN** the example SHALL be used (copied in setup, or read directly by the personal-data check)
- **AND** the build/tests SHALL NOT require real personal data
