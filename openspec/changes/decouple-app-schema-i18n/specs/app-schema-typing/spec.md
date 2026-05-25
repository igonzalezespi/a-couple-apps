## ADDED Requirements

### Requirement: Apps compose their own typed Database

`@aca/core` SHALL expose a `BaseDatabase` describing only the cross-app schemas (`public`, `shared`) and SHALL NOT hard-code any individual app's schema. `createSupabaseClient` and `AppSupabaseClient` SHALL be generic over the database shape, defaulting to `BaseDatabase`, so an app SHALL be able to compose and pass its own database type (e.g. a movies database adding the `movies` schema) and obtain a fully typed client.

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
- **WHEN** it uses `createSupabaseClient` / `AppSupabaseClient`
- **THEN** the type SHALL default to `BaseDatabase`
- **AND** existing code SHALL compile unchanged
