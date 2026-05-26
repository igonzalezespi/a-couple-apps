## ADDED Requirements

### Requirement: Unit and component testing

The repository SHALL use Vitest for unit and component tests, configured per package, with the correct environment per package (Node for pure logic; jsdom for component/web packages). Component tests SHALL render React Native primitives through a `react-native` -> `react-native-web` resolve alias under `@testing-library/react`, so the design system is testable in jsdom. Every package containing non-trivial logic SHALL ship with tests. (Coverage thresholds and `type-coverage` are out of scope for the foundation; see ROADMAP Phase 8.)

#### Scenario: Test suite runs

- **GIVEN** the configured workspace
- **WHEN** `pnpm test` runs
- **THEN** all package suites SHALL pass

#### Scenario: Component renders under the test renderer

- **GIVEN** a `@aca/ui` primitive
- **WHEN** rendered with `@testing-library/react` over the `react-native` -> `react-native-web` alias
- **THEN** role/text assertions SHALL pass against the rendered tree

### Requirement: Cross-platform end-to-end testing

End-to-end coverage SHALL use Maestro for native (iOS/Android) flows under `.maestro/` and Playwright for the React Native Web build under `e2e/`. Both SHALL be runnable locally and wired into CI (the native flow is label-gated).

#### Scenario: Web e2e runs against the RN-Web build

- **GIVEN** the app exported/served for web
- **WHEN** `pnpm e2e` runs the Playwright smoke spec
- **THEN** it SHALL load the web build and assert the expected root content

#### Scenario: Native e2e flow is runnable

- **GIVEN** a Maestro flow in `.maestro/`
- **WHEN** a contributor runs the documented Maestro command against a simulator/emulator
- **THEN** the flow SHALL execute the scripted steps and report pass/fail
