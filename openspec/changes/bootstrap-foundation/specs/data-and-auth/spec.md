## ADDED Requirements

### Requirement: Supabase as the single data boundary

`packages/core` SHALL own all Supabase access: the client, authentication, and data hooks. Apps SHALL consume `@aca/core` hooks and SHALL NOT import `@supabase/supabase-js` directly. Request/response shapes SHALL be defined as zod contracts in `core/src/contracts.ts`. Server state SHALL be managed via TanStack Query.

#### Scenario: App uses core hooks, not the raw client

- **GIVEN** an app feature needing data
- **WHEN** it reads or writes via `@aca/core` hooks
- **THEN** typecheck and lint SHALL pass
- **AND** a direct `@supabase/supabase-js` import in an app SHALL be rejected by the lint boundary

#### Scenario: Auth session is exposed

- **GIVEN** a configured Supabase project and valid env
- **WHEN** a user signs in through the core auth hook
- **THEN** the session SHALL be available to apps via `@aca/core`
- **AND** signing out SHALL clear it

### Requirement: One Supabase project with shared and per-app schemas

The backend SHALL be a single Supabase project. Cross-app data SHALL live in a `shared` Postgres schema; each app SHALL own a dedicated schema (`movies`, `plans`). Row-level security SHALL scope data to the couple. The foundation SHALL provision only the `shared` schema plus auth/realtime plumbing; per-app schemas SHALL be added by their app changes.

#### Scenario: Shared schema provisioned by the foundation

- **GIVEN** the foundation migrations
- **WHEN** they are applied to the Supabase project
- **THEN** a `shared` schema SHALL exist for cross-app data (the couple, profiles)
- **AND** no per-app (`movies`/`plans`) tables SHALL be created by the foundation

#### Scenario: App schema is isolated and couple-scoped

- **GIVEN** an app change that adds its schema
- **WHEN** its migration runs
- **THEN** the app's tables SHALL live in that app's schema
- **AND** RLS SHALL restrict rows to the configured couple

### Requirement: Realtime sync between the two users

`packages/core` SHALL provide a realtime helper that subscribes to a couple-scoped channel and updates/invalidates the TanStack Query cache so a change made by one user becomes visible to the other without a manual refresh.

#### Scenario: Change propagates to the other user

- **GIVEN** both users subscribed to the same couple-scoped channel
- **WHEN** user A inserts or updates a shared record
- **THEN** user B's query cache SHALL be invalidated or updated for that record
- **AND** user B's UI SHALL reflect the change without a manual reload

#### Scenario: Subscription cleans up

- **GIVEN** a mounted realtime subscription
- **WHEN** the consuming screen unmounts
- **THEN** the channel SHALL be unsubscribed to avoid leaks
