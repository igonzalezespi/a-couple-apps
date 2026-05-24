## ADDED Requirements

### Requirement: Authenticated access

The movie watchlist SHALL be available only to an authenticated member of the couple. Unauthenticated users SHALL be shown a sign-in screen; authentication SHALL use Supabase (email OTP) via `@aca/core`, and the session SHALL persist across launches (AsyncStorage on native, localStorage on web).

#### Scenario: Sign-in gate

- **GIVEN** no active session
- **WHEN** the app launches
- **THEN** the sign-in screen SHALL be shown, not the watchlist

#### Scenario: Authenticated entry

- **GIVEN** a valid session (via `@aca/core` `useSession`)
- **WHEN** the app launches
- **THEN** the watchlist SHALL be shown
- **AND** signing out SHALL return to the sign-in screen

### Requirement: Configured-language movie search

The app SHALL search movies via TMDB using the configured language (`@aca/i18n` `resolveExternalLang`), so a Spanish-configured couple sees Spanish titles/overviews.

#### Scenario: Search uses the configured language

- **GIVEN** the effective language is `es`
- **WHEN** a TMDB search request is made
- **THEN** the request SHALL include `language=es-ES`
- **AND** for `en` it SHALL include `language=en-US`

### Requirement: Shared watchlist

Both members SHALL share one watchlist. A user SHALL be able to add a movie (from search), mark it watched/unwatched, and remove it. All reads and writes SHALL go through `@aca/core` hooks; the app SHALL NOT import `@supabase/supabase-js` directly. Watchlist rows SHALL be validated against a zod contract.

#### Scenario: Add, mark watched, remove

- **GIVEN** an authenticated user on the watchlist
- **WHEN** they add a movie from search results
- **THEN** it SHALL appear in the shared watchlist persisted in the `movies` schema
- **AND** marking it watched SHALL update its state
- **AND** removing it SHALL delete it from the watchlist

#### Scenario: Couple-scoped access (RLS)

- **GIVEN** the `movies.watchlist_items` table with RLS
- **WHEN** a user queries the watchlist
- **THEN** they SHALL see only their couple's items

### Requirement: Realtime sync between the two users

A change made by one member SHALL appear for the other without a manual refresh, via the `@aca/core` realtime → query-cache invalidation.

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
