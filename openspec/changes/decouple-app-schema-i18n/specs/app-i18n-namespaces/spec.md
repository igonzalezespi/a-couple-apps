## ADDED Requirements

### Requirement: Shared common strings, per-app namespaces

`@aca/i18n` SHALL own only shared (`common`) translation strings and the namespace machinery; each app SHALL register its own translation namespace (en/es) without editing `@aca/i18n`. A namespace-bound locale accessor SHALL let an app read its strings without prefixing every key.

#### Scenario: App registers its namespace

- **GIVEN** an app with its own en/es strings
- **WHEN** it registers them as a namespace at startup
- **THEN** its components SHALL resolve those strings via a namespace-bound accessor
- **AND** `@aca/i18n` SHALL require no edit to add the app's strings

#### Scenario: Common strings remain shared

- **GIVEN** the `common` namespace in `@aca/i18n`
- **WHEN** any app reads a common string
- **THEN** it SHALL resolve from the shared bundle
- **AND** en/es parity SHALL hold per namespace

#### Scenario: Language switching spans namespaces

- **GIVEN** the configured language changes
- **WHEN** a screen mixing common and app strings re-renders
- **THEN** both the common and the app-namespace strings SHALL reflect the new language
