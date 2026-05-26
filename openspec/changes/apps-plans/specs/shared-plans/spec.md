## ADDED Requirements

### Requirement: Person-attributed shared plans (no sign-in)

The app SHALL NOT use authentication. Both members SHALL share one plans/events list. A member
SHALL be able to create a plan, edit it, mark it complete or incomplete, and delete it. Every plan
SHALL record which `couple.config` person created it (`created_by`, a person id), set from the
locally-selected person, never from an auth user. All reads and writes SHALL go through `@aca/core`
hooks; the app SHALL NOT import `@supabase/supabase-js` directly. Plan rows SHALL be validated
against a zod contract.

#### Scenario: Create, edit, complete, delete

- **GIVEN** a member on the plans list
- **WHEN** they create a plan with a title and a date
- **THEN** it SHALL appear in the shared list persisted in the `plans` schema
- **AND** it SHALL record the creating person as `created_by`
- **AND** editing it SHALL update its fields
- **AND** marking it complete SHALL update its state (and SHALL be reversible to incomplete)
- **AND** deleting it SHALL remove it from the list

#### Scenario: Either person can act on a shared plan

- **GIVEN** a plan created by Person A
- **WHEN** Person B marks it complete or deletes it
- **THEN** the change SHALL be allowed (the list is shared)
- **AND** the original `created_by` attribution SHALL remain unchanged

### Requirement: Date and time handling (all-day vs timed)

A plan SHALL carry a start (`starts_at`) and SHALL distinguish an all-day plan (only the day
matters) from a timed plan (a clock time matters). A plan MAY carry an optional end (`ends_at`);
when present it SHALL NOT precede the start. The UI SHALL render dates and times using the device
locale.

#### Scenario: A timed plan shows its time

- **GIVEN** a plan with a specific start time (e.g. a 21:00 concert)
- **WHEN** the list renders it
- **THEN** it SHALL display the time alongside the date

#### Scenario: An all-day plan omits a time

- **GIVEN** an all-day plan (e.g. an exhibition open all week)
- **WHEN** the list renders it
- **THEN** it SHALL display the day without a misleading clock time

#### Scenario: An end cannot precede the start

- **GIVEN** a plan with an end before its start
- **WHEN** it is saved
- **THEN** the save SHALL be rejected (DB CHECK and/or form validation)

### Requirement: Anon RLS with non-rewritable created_by

The `plans.plans` table SHALL enable Row Level Security scoped to the `anon` role (the couple's own
key is the boundary; there is no tenant column and no sign-up surface). `anon` SHALL be able to
read, insert, and delete. UPDATE SHALL be column-scoped to the editable plan fields so that
`created_by` cannot be overwritten after insert, mirroring the `movies` schema's `added_by`
protection.

#### Scenario: Reads and writes use the anon role

- **GIVEN** the couple's app built with their anon key
- **WHEN** it reads or writes plans
- **THEN** the operations SHALL be authorized for `anon`

#### Scenario: created_by is immutable after insert

- **GIVEN** an existing plan with a `created_by` person id
- **WHEN** an update is attempted that tries to change `created_by`
- **THEN** `created_by` SHALL NOT change (UPDATE is granted only on the editable plan fields)

### Requirement: Realtime sync between the two people

A change made by one member SHALL appear for the other without a manual refresh, via the
`@aca/core` realtime -> query-cache invalidation on the `plans` schema.

#### Scenario: A change propagates live

- **GIVEN** both members viewing the plans list
- **WHEN** member A creates, edits, completes, or deletes a plan
- **THEN** member B's list SHALL update without a manual refresh
- **AND** unmounting the screen SHALL unsubscribe the channel

### Requirement: Cross-platform UI from the design system

Every screen SHALL be built from `@aca/ui` primitives (no ad-hoc colors or spacing) and SHALL run
on iOS, Android, and web from the one codebase, looking identical to the movies app.

#### Scenario: Renders on web from shared primitives

- **GIVEN** the exported React Native Web build
- **WHEN** the plans list and the create/edit form render
- **THEN** they SHALL display using `@aca/ui` tokens/components
- **AND** the same components SHALL compile for the native targets
