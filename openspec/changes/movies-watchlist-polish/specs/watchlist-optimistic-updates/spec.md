## ADDED Requirements

### Requirement: Instant, reversible watchlist actions

Marking an item watched SHALL update the UI optimistically and roll back if the request fails. Removing an item SHALL offer an undo before the deletion is final.

#### Scenario: Optimistic mark watched

- **GIVEN** an unwatched item
- **WHEN** the user marks it watched
- **THEN** the UI SHALL reflect "watched" immediately, before the server responds
- **AND** if the request fails, it SHALL revert to "unwatched"

#### Scenario: Undo a remove

- **GIVEN** an item on the watchlist
- **WHEN** the user removes it and then chooses undo within the undo window
- **THEN** the item SHALL be restored
- **AND** if undo is not chosen, the deletion SHALL become final
