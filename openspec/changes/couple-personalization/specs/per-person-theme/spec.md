## ADDED Requirements

### Requirement: Each person may have a favorite accent color

A person MAY declare a favorite accent color (`red` or `purple`). The design system (`@aca/ui`) SHALL provide these accent palettes, and the app SHALL apply the current person's accent as the primary theme color when that person is selected, falling back to the couple-wide theme override and then the default palette when unset.

#### Scenario: The app re-skins to the selected person

- **GIVEN** two people with different favorite colors
- **WHEN** one person is selected
- **THEN** the app's primary/accent SHALL be that person's color
- **AND** WHEN the other person is selected, it SHALL change to theirs

#### Scenario: No color set

- **GIVEN** a person with no favorite color
- **WHEN** they are selected
- **THEN** the app SHALL use the couple-wide theme override if present, otherwise the default palette

#### Scenario: Colors come from the design system

- **GIVEN** the `red` and `purple` accents
- **WHEN** the app themes itself to one
- **THEN** the palette SHALL come from `@aca/ui` (no app-level color literals)
- **AND** `onPrimary` SHALL stay readable against that accent on both light and dark
