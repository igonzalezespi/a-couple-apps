# App Schema Typing

## Purpose

Let each app compose its own fully-typed Supabase `Database` from a shared `BaseDatabase`, so `@aca/core` carries only the cross-app schemas and never hard-codes any individual app's schema. Adding an app's tables requires no edit to the shared core package.

## Requirements

### Requirement: Apps compose their own typed Database

`@aca/core` SHALL expose a `BaseDatabase` describing only the cross-app schemas (`public`, `shared`) and SHALL NOT hard-code any individual app's schema. `createSupabaseClient`, `AppSupabaseClient`, and the `useSupabase` hook SHALL be generic over the database shape, defaulting to `BaseDatabase`, so an app SHALL be able to compose and pass its own database type (e.g. a movies database adding the `movies` schema) and obtain a fully typed client both at creation and at the consumption boundary. `BaseDatabase` SHALL be exported from the `@aca/core` barrel, and the prior `Database` export SHALL remain as a backward-compatible alias of `BaseDatabase`.

#### Scenario: Core carries no app schema

- **GIVEN** the `@aca/core` `BaseDatabase` type
- **WHEN** it is inspected
- **THEN** it SHALL contain only `public` and `shared`
- **AND** SHALL NOT reference any app-specific schema

#### Scenario: An app extends the base

- **GIVEN** an app that defines its database as `BaseDatabase` plus its own schema
- **WHEN** it creates a client with that type
- **THEN** schema-qualified calls for its own schema SHALL be typed
- **AND** `@aca/core` SHALL require no edit to support the new schema

#### Scenario: Default keeps existing call sites working

- **GIVEN** a caller that does not specify a database type
- **WHEN** it uses `createSupabaseClient` / `AppSupabaseClient` / `useSupabase`
- **THEN** the type SHALL default to `BaseDatabase`
- **AND** existing code SHALL compile unchanged

#### Scenario: Consumption boundary keeps the app's schema typed

- **GIVEN** an app whose database type adds its own schema and that obtains its client via the `useSupabase` hook
- **WHEN** it calls `useSupabase<AppDatabase>()` and then a schema-qualified call for its own schema
- **THEN** the hook SHALL return a client typed at `AppDatabase`
- **AND** the schema-qualified call SHALL typecheck (it SHALL NOT regress to the base default)
- **AND** the app SHALL achieve this by composing a type and calling `@aca/core`, never importing `@supabase/supabase-js`
