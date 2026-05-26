# Data and Auth

## Purpose

Define the single data boundary for the apps: `@aca/core` owns all Supabase access and realtime sync. There is no authentication -- each couple builds the apps against their own private Supabase project, so identity is a local, switchable choice from the configured people (see the couple-config and current-person-display capabilities) and a build's own anon key is the access boundary.

## Requirements

### Requirement: Supabase as the single data boundary

`packages/core` SHALL own all Supabase access: the client, the data hooks, and the realtime helper. Apps SHALL consume `@aca/core` hooks and SHALL NOT import `@supabase/supabase-js` directly. Request/response shapes SHALL be defined as zod contracts (shared ones in `@aca/core`, per-app ones in the app). Server state SHALL be managed via TanStack Query.

#### Scenario: App uses core hooks, not the raw client

- **GIVEN** an app feature needing data
- **WHEN** it reads or writes via `@aca/core` hooks
- **THEN** typecheck and lint SHALL pass
- **AND** a direct `@supabase/supabase-js` import in an app SHALL be rejected by the lint boundary

### Requirement: No authentication; local person selection is identity

There SHALL be no login, sign-in, email OTP, session, or `profiles` table. On first launch the app SHALL ask which of the two configured people is using this device; the choice SHALL be persisted on-device via `@aca/core` (`PersonProvider`) and SHALL be switchable. Writes SHALL be attributed by recording the selected person's couple.config id (text), not an authenticated user.

#### Scenario: First launch asks who you are

- **GIVEN** a device with no stored person selection
- **WHEN** the app launches
- **THEN** it SHALL prompt the user to pick one of the configured people
- **AND** after picking, the choice SHALL persist across launches until it is switched

#### Scenario: Writes carry the selected person id

- **GIVEN** a selected person
- **WHEN** that person creates a shared record
- **THEN** the record SHALL be attributed to that person's couple.config id (text)
- **AND** no authenticated-user identifier SHALL be required

### Requirement: One Supabase project with shared and per-app schemas

The backend SHALL be a single self-hosted Supabase project per couple. Cross-app data SHALL live in a `shared` Postgres schema; each app SHALL own a dedicated schema (`movies`, `plans`). The foundation SHALL provision only the `shared` schema plus realtime plumbing; per-app schemas SHALL be added by their app changes. Because there is no per-user auth, row-level security SHALL target the `anon` role, and the couple's own anon key (embedded in their private, non-distributed build) SHALL be the access boundary.

#### Scenario: Shared schema provisioned by the foundation

- **GIVEN** the foundation migrations
- **WHEN** they are applied to the Supabase project
- **THEN** a `shared` schema SHALL exist for cross-app data
- **AND** it SHALL have no tables (there is no `profiles`); per-app (`movies`/`plans`) tables SHALL NOT be created by the foundation

#### Scenario: App schema is isolated and anon-scoped

- **GIVEN** an app change that adds its schema
- **WHEN** its migration runs
- **THEN** the app's tables SHALL live in that app's schema with RLS enabled
- **AND** access SHALL be granted to the `anon` role (the build's anon key is the boundary)

### Requirement: Realtime sync between the two users

`packages/core` SHALL provide a realtime helper that subscribes to a channel and updates/invalidates the TanStack Query cache so a change made by one user becomes visible to the other without a manual refresh.

#### Scenario: Change propagates to the other user

- **GIVEN** both users subscribed to the same channel
- **WHEN** user A inserts or updates a shared record
- **THEN** user B's query cache SHALL be invalidated or updated for that record
- **AND** user B's UI SHALL reflect the change without a manual reload

#### Scenario: Subscription cleans up

- **GIVEN** a mounted realtime subscription
- **WHEN** the consuming screen unmounts
- **THEN** the channel SHALL be unsubscribed to avoid leaks
