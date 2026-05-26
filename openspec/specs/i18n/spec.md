# i18n

## Purpose

Make all UI strings translatable (English and Spanish) with runtime switching and a clear language-resolution precedence, and have the configured language also drive external data queries (e.g. TMDB).

## Requirements

### Requirement: Translatable UI with en/es and runtime switching

`packages/i18n` SHALL provide i18next-based translations for at least English (`en`) and Spanish (`es`), expose a hook for runtime language switching, and resolve the effective language in this precedence: explicit user setting -> `couple.config.defaultLanguage` -> device locale (via `expo-localization`) -> `en`. All UI-facing strings SHALL be looked up by key; source code, comments, and docs SHALL remain English.

#### Scenario: Language resolution precedence

- **GIVEN** no explicit user setting and `couple.config.defaultLanguage = 'es'`
- **WHEN** the i18n layer initializes
- **THEN** the effective language SHALL be `es`
- **AND** when a user later selects `en` at runtime, all strings SHALL update to English without a reload

#### Scenario: Missing translation key is caught

- **GIVEN** a string key present in `en` but absent in `es`
- **WHEN** the i18n resources are validated
- **THEN** the missing-key guard SHALL flag the gap

### Requirement: Configured language drives external data

The i18n layer SHALL expose `resolveExternalLang(lang)` mapping the app language to provider locale codes so external data queries (e.g. TMDB) use the configured language.

#### Scenario: External language mapping

- **GIVEN** the effective language is `es`
- **WHEN** `resolveExternalLang` is called for a TMDB request
- **THEN** it SHALL return `es-ES`
- **AND** for `en` it SHALL return `en-US`
