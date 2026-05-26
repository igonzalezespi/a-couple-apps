## ADDED Requirements

### Requirement: Search as you type

The search screen SHALL query TMDB as the user types (debounced) and SHALL provide a control to clear the query and results.

#### Scenario: Debounced search

- **GIVEN** the search screen
- **WHEN** the user types a query and pauses
- **THEN** a single search request SHALL fire after typing stops (not one per keystroke)
- **AND** results SHALL update for the typed query

#### Scenario: Clear the search

- **GIVEN** a query with results
- **WHEN** the user activates the clear control
- **THEN** the query field and the results SHALL be emptied

### Requirement: Settings screen owns app preferences

The app SHALL provide a settings screen that owns the language switch (moved off the home screen), and the home screen SHALL link to it.

#### Scenario: Change language in settings

- **GIVEN** the settings screen
- **WHEN** the user changes the language
- **THEN** the app's strings SHALL update to the chosen language
- **AND** the language switch SHALL no longer appear on the home screen
