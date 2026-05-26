## ADDED Requirements

### Requirement: Single design-system source of truth

`packages/ui` SHALL be the sole source of visual styling: a Tamagui design system exposing theme tokens (color, space, radius, size, font), named themes (at least light and dark), and shared primitives/components. Apps SHALL style exclusively through `@aca/ui` and SHALL NOT define their own ad-hoc colors or spacing values.

#### Scenario: Both apps render identically from shared primitives

- **GIVEN** two apps each rendering the same `@aca/ui` primitive (e.g. `Button` with `tone="primary"`)
- **WHEN** rendered on iOS, Android, and web
- **THEN** the resolved tokens (color, spacing, radius, typography) SHALL be identical across both apps and all three platforms

#### Scenario: Raw style literal is discouraged in apps

- **GIVEN** an app component
- **WHEN** it hardcodes a color or spacing literal instead of a token
- **THEN** the design-system guidance (and lint where configured) SHALL flag it in favor of a `@aca/ui` token

### Requirement: Theme overrides from configuration

The design system SHALL accept optional `theme` overrides from `couple.config.ts` and merge them into the active Tamagui theme, so a forker can re-skin both apps from configuration without editing `packages/ui`.

#### Scenario: Config override changes the resolved theme

- **GIVEN** a `couple.config.ts` with a `theme.primary` override
- **WHEN** the app mounts the `@aca/ui` theme provider
- **THEN** components using the primary token SHALL render with the overridden value
- **AND** removing the override SHALL restore the default token
