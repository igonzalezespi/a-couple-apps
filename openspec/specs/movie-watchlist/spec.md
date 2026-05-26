# Movie Watchlist

## Purpose

The movies app: a couple's shared, realtime watchlist. Either person searches TMDB in the configured language and adds movies; both share one list and can mark items watched/unwatched or remove them. There is no sign-in -- access is gated by picking which of the two configured people is using this device.

## Requirements

### Requirement: Person selection (no sign-in)

The app SHALL NOT use authentication. On first launch it SHALL present a person picker offering the two configured people; until one is chosen, the watchlist SHALL NOT be shown. The selection SHALL persist across launches (AsyncStorage on native, the same storage on React Native Web) and SHALL be switchable, returning to the picker.

#### Scenario: Person-selection gate

- **GIVEN** no stored person selection
- **WHEN** the app launches
- **THEN** the person picker SHALL be shown, not the watchlist

#### Scenario: Selected entry

- **GIVEN** a stored person selection
- **WHEN** the app launches
- **THEN** the watchlist SHALL be shown
- **AND** switching person SHALL return to the picker

### Requirement: Configured-language movie search

The app SHALL search movies via TMDB using the configured language (`@aca/i18n` `resolveExternalLang`), so a Spanish-configured couple sees Spanish titles/overviews.

#### Scenario: Search uses the configured language

- **GIVEN** the effective language is `es`
- **WHEN** a TMDB search request is made
- **THEN** the request SHALL include `language=es-ES`
- **AND** for `en` it SHALL include `language=en-US`

### Requirement: Shared watchlist

Both members SHALL share one watchlist. A user SHALL be able to add a movie (from search), mark it watched/unwatched, and remove it. A movie SHALL appear at most once on the list (a unique constraint on the TMDB id; a duplicate add SHALL surface a friendly "already on the list" message). Each item SHALL record which person added it, and the UI SHALL show that attribution ("you" for the current person, otherwise that person's configured name). All reads and writes SHALL go through `@aca/core` hooks; the app SHALL NOT import `@supabase/supabase-js` directly. Watchlist rows SHALL be validated against a zod contract.

#### Scenario: Add, mark watched, remove

- **GIVEN** a selected person on the watchlist
- **WHEN** they add a movie from search results
- **THEN** it SHALL appear in the shared watchlist persisted in the `movies` schema, attributed to that person
- **AND** marking it watched SHALL update its state
- **AND** removing it SHALL delete it from the watchlist

#### Scenario: A movie is on the list at most once

- **GIVEN** a movie already on the shared list
- **WHEN** a user attempts to add it again
- **THEN** the second add SHALL be prevented by the unique constraint
- **AND** the user SHALL see a friendly "already on the list" message rather than an error

#### Scenario: Anon-scoped access (RLS)

- **GIVEN** the `movies.watchlist_items` table with RLS targeting the `anon` role
- **WHEN** the app queries the watchlist with the build's anon key
- **THEN** it SHALL read and write the shared list
- **AND** `added_by` SHALL NOT be rewritable after insert (the update grant is column-scoped)

### Requirement: Realtime sync between the two users

A change made by one member SHALL appear for the other without a manual refresh, via the `@aca/core` realtime -> query-cache invalidation.

#### Scenario: A change propagates live

- **GIVEN** both members viewing the watchlist
- **WHEN** member A adds or marks a movie watched
- **THEN** member B's watchlist SHALL update without a manual refresh
- **AND** unmounting the screen SHALL unsubscribe the channel

### Requirement: Cross-platform UI from the design system

Every screen SHALL be built from `@aca/ui` primitives (no ad-hoc styling) and SHALL run on iOS, Android, and web from the one codebase.

#### Scenario: Renders on web from shared primitives

- **GIVEN** the exported React Native Web build
- **WHEN** the watchlist screen renders
- **THEN** it SHALL display using `@aca/ui` tokens/components
- **AND** the same components SHALL compile for the native targets
