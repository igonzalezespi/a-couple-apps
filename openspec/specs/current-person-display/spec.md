# Current Person Display

## Purpose

Make the locally-selected identity always visible: show which of the couple is currently using the app -- their name, in their favorite color -- on every screen, and keep it in sync when the person is switched.

## Requirements

### Requirement: The current person is visible on every screen

The app SHALL display which person is currently using it -- their name, with their color -- on every screen, not only the home screen.

#### Scenario: Identity visible across navigation

- **GIVEN** a selected person
- **WHEN** the user navigates between screens (home, search)
- **THEN** the current person's name SHALL be visible on each
- **AND** SHALL reflect that person's favorite color

#### Scenario: Updates on switch

- **GIVEN** the current person is shown
- **WHEN** the user switches person
- **THEN** the displayed identity SHALL update to the newly selected person
