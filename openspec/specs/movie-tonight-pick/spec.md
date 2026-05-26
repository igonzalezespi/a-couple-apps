# Movie Tonight Pick

## Purpose

Give the couple one shared "Tonight's pick" over the watchlist: either person nominates a single unwatched movie, it floats to the top for both in realtime with attribution, and it auto-clears when that movie is watched or removed.

## Requirements

### Requirement: Single shared Tonight's pick

The watchlist SHALL support at most one "Tonight's pick" -- a single to-watch item flagged for the couple. Either person SHALL be able to set or clear it, and setting a pick SHALL clear any previously picked item, so no more than one item is ever the pick at a time.

#### Scenario: Setting a pick

- **GIVEN** a shared watchlist with no current pick
- **WHEN** a person picks an item for tonight
- **THEN** that item SHALL be flagged as the pick, recording which person set it
- **AND** both partners SHALL see it as the pick in realtime

#### Scenario: Only one pick at a time

- **GIVEN** an item is already the pick
- **WHEN** a person picks a different item
- **THEN** the new item SHALL become the pick
- **AND** the previously picked item SHALL no longer be the pick

#### Scenario: Clearing a pick

- **GIVEN** an item is the current pick
- **WHEN** a person clears the pick
- **THEN** no item SHALL be the pick
- **AND** both partners SHALL see it cleared in realtime

### Requirement: Pick auto-clears when its movie is done

A Tonight's pick SHALL be cleared automatically when its item is marked watched or removed, so the pick never outlives the movie.

#### Scenario: Marking the pick watched

- **GIVEN** the picked item
- **WHEN** either partner marks it watched
- **THEN** the item SHALL move to the watched state
- **AND** it SHALL no longer be the pick

#### Scenario: Removing the pick

- **GIVEN** the picked item
- **WHEN** either partner removes it
- **THEN** the item SHALL be gone
- **AND** no item SHALL be the pick

### Requirement: Pick surfaces first with attribution

The Tonight's pick SHALL be visually distinguished and SHALL sort to the top of the watchlist for both partners, and the UI SHALL show which person set it ("you" for the current person, otherwise that person's configured name).

#### Scenario: Pick floats to the top

- **GIVEN** a watchlist with several to-watch items and one pick
- **WHEN** the watchlist renders
- **THEN** the pick SHALL appear first
- **AND** SHALL carry a "Tonight's pick" treatment distinct from the other rows

#### Scenario: Attribution to the setter

- **GIVEN** a pick set by Person A
- **WHEN** Person B views the watchlist
- **THEN** the pick SHALL be attributed to "Person A"
- **AND** WHEN Person A views it, the pick SHALL be attributed to "you"
