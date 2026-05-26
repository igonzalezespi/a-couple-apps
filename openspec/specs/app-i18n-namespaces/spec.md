# App i18n Namespaces

## Purpose

Keep shared (`common`) translation strings in `@aca/i18n` while each app owns and registers its own translation namespace, so adding an app's strings needs no edit to the shared i18n package. A namespace-bound accessor with `common` fallback keeps call sites prefix-free.

## Requirements

### Requirement: Shared common strings, per-app namespaces

`@aca/i18n` SHALL own only shared (`common`) translation strings and the namespace machinery; each app SHALL register its own translation namespace (en/es) without editing `@aca/i18n`. The `common` namespace SHALL be the default namespace, and an app namespace SHALL be registered with `fallbackNS: 'common'` so a component reaching for a shared key resolves it without prefixing. A namespace-bound locale accessor (`useAppLocale(namespace)`) SHALL let an app read its strings without prefixing every key, and SHALL also surface the namespace-independent `language`, `languages`, and `setLanguage`. The allocation rule SHALL keep shell / person-gate / generic-action / language / app-label strings in `common`, and domain strings in the owning app's namespace. The en/es compile-time key guard SHALL be split per namespace so en/es parity stays compile-enforced per namespace.

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

#### Scenario: App namespace falls back to common

- **GIVEN** a component bound to an app namespace via the namespace-bound accessor
- **WHEN** it reads a key that exists only in `common` alongside keys in its own namespace
- **THEN** the app-namespace key SHALL resolve from the app bundle
- **AND** the common-only key SHALL resolve from `common` via the namespace fallback
- **AND** the component SHALL need only the single namespace-bound accessor (no per-key namespace routing)

#### Scenario: Accessor exposes language controls

- **GIVEN** a component using the namespace-bound accessor `useAppLocale(namespace)`
- **WHEN** it reads `language` and calls `setLanguage`
- **THEN** the accessor SHALL return `{ t, language, languages, setLanguage }`
- **AND** `language` / `setLanguage` SHALL be identical to the shared `useLocale` accessor (namespace-independent), so language-dependent paths (e.g. external-language resolution) keep working after a component swaps to the namespace-bound accessor
