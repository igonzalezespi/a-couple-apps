# Testing

## Purpose

Define the testing strategy: Vitest with the React testing library for unit/component tests under coverage thresholds, plus cross-platform end-to-end coverage (Maestro for native, Playwright for the React Native Web build), runnable locally and wired into CI.

## Requirements

### Requirement: Unit and component testing with coverage thresholds

The repository SHALL use Vitest with `@testing-library/react-native` for unit and component tests, configured per package, with v8 coverage thresholds (global >= 80%, critical packages >= 85%) and `type-coverage` >= 95%. Every package containing non-trivial logic SHALL ship with tests.

#### Scenario: Test suite runs with coverage gate

- **GIVEN** the configured workspace
- **WHEN** `pnpm test` runs
- **THEN** all package suites SHALL pass
- **AND** coverage below the configured thresholds SHALL fail the run

#### Scenario: Component renders under the test renderer

- **GIVEN** a `@aca/ui` primitive
- **WHEN** rendered with `@testing-library/react-native`
- **THEN** role/text assertions SHALL pass against the rendered tree

### Requirement: Cross-platform end-to-end testing

End-to-end coverage SHALL use Maestro for native (iOS/Android) flows under `.maestro/` and Playwright for the React Native Web build under `e2e/`. Both SHALL be runnable locally and wired into CI (label-gated).

#### Scenario: Web e2e runs against the RN-Web build

- **GIVEN** the app exported/served for web
- **WHEN** `pnpm e2e` runs the Playwright smoke spec
- **THEN** it SHALL load the web build and assert the expected root content

#### Scenario: Native e2e flow is runnable

- **GIVEN** a Maestro flow in `.maestro/`
- **WHEN** a contributor runs the documented Maestro command against a simulator/emulator
- **THEN** the flow SHALL execute the scripted steps and report pass/fail
