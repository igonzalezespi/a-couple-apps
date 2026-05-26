# Design System

## Purpose

Make `packages/ui` the single source of visual styling so both apps look identical on iOS, Android, and web. The design system also carries the configuration-driven re-skins: couple-wide theme overrides and named per-person accent palettes (red, purple) that the apps select at runtime when a person is active.

## Requirements

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

### Requirement: Named per-person accent palettes

The design system SHALL provide named accent palettes (`red` and `purple`) that the apps can select at runtime. Each palette SHALL set the most visible re-skin (`primary`) plus a readable `onPrimary`, and SHALL be expressed as `${scheme}_${color}` sub-themes (e.g. `light_red`, `dark_purple`) of the base light/dark themes so selecting one is a runtime theme-name switch (no config rebuild). All accent color literals SHALL live in `@aca/ui`, not in app code.

#### Scenario: Accents come from the design system

- **GIVEN** the `red` and `purple` accents
- **WHEN** an app themes itself to one
- **THEN** the palette SHALL come from `@aca/ui` (no app-level color literals)
- **AND** `onPrimary` SHALL stay readable against that accent on both light and dark

#### Scenario: Accent is a runtime theme-name switch

- **GIVEN** the single Tamagui config holding base light/dark plus the per-accent sub-themes
- **WHEN** an app selects a person's accent for the current OS color scheme
- **THEN** it SHALL switch to the `${scheme}_${color}` theme name at runtime
- **AND** no config rebuild or additional `createTamagui` call SHALL be needed
