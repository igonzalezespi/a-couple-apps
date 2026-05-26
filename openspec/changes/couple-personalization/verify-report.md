# Verify Report: couple-personalization

**Change**: `couple-personalization`
**Verified**: `2026-05-26T20:37:32Z`
**Status**: `READY_WITH_WARNINGS`
**Schema**: `spec-driven`
**Iterations**: `1`
**Dry Run**: `false`

## Scorecard

| Dimension    | Metric                      | Value            | Threshold |
| ------------ | --------------------------- | ---------------- | --------- |
| Completeness | Tasks complete              | `12/12`          | --        |
| Completeness | Requirements covered        | `3/3`            | `>= 0.80` |
| Correctness  | Scenarios covered by tests  | `5/8`            | `>= 0.70` |
| Correctness  | Requirements mapped to code | `3/3`            | --        |
| Coherence    | Design decisions followed   | `Y`              | --        |
| Coherence    | Pattern consistency         | `aligned`        | --        |

## Findings

### CRITICAL

_None_

### WARNING

- **[573094f0]** Per-person theme re-skin not unit-tested -- `apps/movies/src/PersonThemedUIProvider.tsx:14-29`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: The scenario "The app re-skins to the selected person" (per-person-theme) is a runtime theme-NAME switch (`${scheme}_${color}`) wired in `PersonThemedUIProvider`. The palette resolution it depends on is unit-tested (`packages/ui/src/theme.test.ts:39-58`), but no test asserts the provider selects `light_red` / `dark_purple` for the active person, and the full visual re-skin is only observable on-device. This is a runtime/visual behavior, not a logic gap.
  - **Recommendation**: Defer a focused render test of `PersonThemedUIProvider` (assert `defaultTheme` for a colored vs. uncolored person) and record the visual re-skin as a Manual Action (see Manual 1).
  - **Auto-fix eligible**: no (retroactive backfill -- do not add tests; visual portion is human-only)

- **[254dd023]** Badge identity update on person switch not unit-tested -- `apps/movies/src/CurrentPersonBadge.tsx:9-25`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: The scenario "Updates on switch" (current-person-display) is not covered. `apps/movies/src/CurrentPersonBadge.test.tsx` asserts the badge shows the selected name and renders nothing when unselected, but never switches the active person and re-asserts. The underlying switch mechanism is covered in `packages/core/src/person.test.tsx:65-71` (`setPerson` updates `person`), so the behavior is sound; only the badge-level re-render is unverified.
  - **Recommendation**: Defer a badge test that fires a person switch and asserts the displayed name updates.
  - **Auto-fix eligible**: no (retroactive backfill -- do not add tests)

### SUGGESTION

- **[af885959]** Missing-config error is a raw module-resolution failure, not a friendly message -- `apps/movies/app/_layout.tsx:9`
  - **Dimension**: coherence
  - **Kind**: pattern_deviation
  - **Detail**: Task 1.3 mentions "a clear error if missing." The delta-spec scenario "Tooling runs without a private config" is fully satisfied (CI copies the example at `.github/actions/setup-repo/action.yml:24-26`; the personal-data check imports `couple.config.example` directly). For a running app with no `couple.config.ts`, the static `import coupleConfig from '../../../couple.config'` surfaces as a bundler/module-resolution error rather than a tailored message. The delta spec does not require a friendly message, so this is cosmetic, not a divergence.
  - **Recommendation**: Defer an optional clearer error/guard at the import boundary (e.g. a setup check that names the missing file and the copy command).
  - **Auto-fix eligible**: no (out of scope for a retroactive backfill; not a single-line lint fix)

- **[7aae57df]** person.color schema field has no direct parse test -- `packages/config/src/schema.ts:9-17`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: `accentColorSchema` and the optional `color` on `personSchema` are implemented and exercised end-to-end (the example sets `red`/`purple`, `getSharedConfig` validates it on import in `no-personal-data.test.ts`). However, `packages/config/src/schema.test.ts` builds people without `color`, so no test directly asserts that a valid color parses and an invalid one is rejected.
  - **Recommendation**: Defer a schema test asserting `color: 'red'|'purple'` parses and an unknown color is rejected.
  - **Auto-fix eligible**: no (retroactive backfill -- do not add tests)

## Fixes Applied During Verify

_None_

## Deferred Work

### Deferred 1: Render test for PersonThemedUIProvider accent selection

- **Origin**: WARNING from correctness / scenario_uncovered
- **Finding ID**: 254dd023
- **Why deferred**: requires human judgment (retroactive backfill; this verify must not add tests)
- **Affected files**: `apps/movies/src/CurrentPersonBadge.test.tsx`, `apps/movies/src/PersonThemedUIProvider.tsx`

**Propose command**:

```
/opsx:propose couple-personalization-badge-switch-test
> Add a CurrentPersonBadge test that switches the active person and asserts the displayed name updates, covering the current-person-display "Updates on switch" scenario. Affects apps/movies/src/CurrentPersonBadge.test.tsx.
```

### Deferred 2: Provider re-skin test for per-person theme

- **Origin**: WARNING from correctness / scenario_uncovered
- **Finding ID**: 573094f0
- **Why deferred**: requires human judgment (retroactive backfill; visual portion is on-device only)
- **Affected files**: `apps/movies/src/PersonThemedUIProvider.tsx`

**Propose command**:

```
/opsx:propose couple-personalization-theme-provider-test
> Add a render test for PersonThemedUIProvider asserting it selects the ${scheme}_${color} theme name for a colored person and the plain scheme otherwise, covering the per-person-theme "re-skins to the selected person" logic. Affects apps/movies/src/PersonThemedUIProvider.tsx.
```

### Deferred 3: Friendly error when couple.config.ts is missing

- **Origin**: SUGGESTION from coherence / pattern_deviation
- **Finding ID**: af885959
- **Why deferred**: out of scope for a retroactive backfill
- **Affected files**: `apps/movies/app/_layout.tsx`

**Propose command**:

```
/opsx:propose couple-config-missing-friendly-error
> Surface a clear, named error (missing couple.config.ts -> copy couple.config.example.ts) instead of a raw module-resolution failure when a running app has no private config. Affects apps/movies/app/_layout.tsx.
```

### Deferred 4: Direct schema test for person.color

- **Origin**: SUGGESTION from correctness / scenario_uncovered
- **Finding ID**: 7aae57df
- **Why deferred**: requires human judgment (retroactive backfill; this verify must not add tests)
- **Affected files**: `packages/config/src/schema.test.ts`

**Propose command**:

```
/opsx:propose couple-config-color-schema-test
> Add schema tests asserting personSchema accepts color 'red'/'purple', treats it as optional, and rejects an unknown color. Affects packages/config/src/schema.test.ts.
```

## Manual Actions Required

### Manual 1: Per-person accent re-skin verified on device

- **Category**: visual
- **Finding ID**: 573094f0
- **Why agent cannot verify**: The full re-skin is a runtime Tamagui theme-NAME switch rendered on a device/web; the agent can confirm the palette values and the theme-name wiring statically but cannot observe the rendered color change.
- **Context**: Switch the active person between one with `color: 'red'` and one with `color: 'purple'`; the app's primary/accent (buttons, the badge dot via `$primary`) must change accordingly, and a person with no color must fall back to the couple-wide theme / default. Verify on both light and dark, with readable `onPrimary` text.
- **Pass criteria**: Selecting each colored person re-skins the primary color to that accent; the uncolored case uses the fallback palette; `onPrimary` stays readable on both schemes.
- **Owner**: human

## Spec Drift Resolutions

_None_

## Test Compliance

**Summary**: 8 scenarios extracted, 4 change-specific test files discovered (`packages/config/src/no-personal-data.test.ts`, `packages/config/src/schema.test.ts`, `packages/ui/src/theme.test.ts`, `apps/movies/src/CurrentPersonBadge.test.tsx`; plus the supporting `packages/core/src/person.test.tsx`), 2 high-confidence matches, 3 medium, 0 low, 0 orphan tests, 3 gaps (1 satisfied as Manual 1).

**Per-scenario table**:

| Requirement | Scenario | Coverage | Matching Test | Confidence | Notes |
|-------------|----------|----------|---------------|------------|-------|
| Real config is private to each instance | Only the template is in source | covered | `packages/config/src/no-personal-data.test.ts:13` | high | Placeholder people asserted; non-tracking of `couple.config.ts` confirmed structurally (`git ls-files`, `.gitignore:12`). |
| Real config is private to each instance | Instance fills a private config | gap | -- | -- | Structural (gitignored per-instance); not unit-testable. Inherent to the privacy mechanism, no logic to cover. |
| Real config is private to each instance | Tooling runs without a private config | covered | `packages/config/src/no-personal-data.test.ts:9` | medium | Personal-data check imports the example directly; CI copy is the other arm (`.github/actions/setup-repo/action.yml:24-26`). |
| Each person may have a favorite accent color | The app re-skins to the selected person | gap | `packages/ui/src/theme.test.ts:52` | medium | Palette resolution covered; provider theme-name selection + visual re-skin not unit-tested. Satisfied as Manual 1; see finding 573094f0. |
| Each person may have a favorite accent color | No color set | covered | `packages/ui/src/theme.test.ts:48` | medium | `accentOverrides()` empty + `createCoupleTheme()` base covered; full provider fallback chain (couple theme -> default) not E2E tested. |
| Each person may have a favorite accent color | Colors come from the design system | covered | `packages/ui/src/theme.test.ts:40` | high | `accentOverrides` returns `ACCENT_PALETTES` values; `onPrimary` set on both schemes. No app-level color literals. |
| The current person is visible on every screen | Identity visible across navigation | covered | `apps/movies/src/CurrentPersonBadge.test.tsx:8` | medium | Badge shows the selected name; rendered persistently in `apps/movies/src/PersonGate.tsx:49` above the navigator. Cross-route rendering is integration/visual. |
| The current person is visible on every screen | Updates on switch | gap | -- | -- | No badge-switch test; underlying `setPerson` switch covered in `packages/core/src/person.test.tsx:65`. See finding 254dd023. |

**Orphan tests**: _None_ (the change-specific tests all map to a scenario or to the supporting person-selection mechanism).

**Gaps**:

- "Instance fills a private config" -- structural/manual (gitignored); no logic to test. Low severity.
- "The app re-skins to the selected person" -- runtime/visual; satisfied as Manual 1, provider logic deferred (573094f0). Medium severity.
- "Updates on switch" -- badge re-render unverified; mechanism covered in core. Deferred (254dd023). Medium severity.

## Final Assessment

All 12 tasks are complete and evidenced against the repo: `couple.config.ts` is untracked and gitignored (`.gitignore:12`), the committed `couple.config.example.ts` carries only `Person A`/`Person B` placeholders with `red`/`purple` colors, the `no-personal-data` test targets the example, CI provides a placeholder config in `setup-repo`, the red/purple accent palettes plus `accentOverrides`/`buildThemes` live in `@aca/ui`, `personSchema`/`@aca/core` `Person` thread the optional `color`, `PersonThemedUIProvider` re-skins by switching the Tamagui theme name, and `CurrentPersonBadge` renders the current person (name + `$primary` dot) persistently in `PersonGate` on every screen with an i18n accessibility label (en + es). All 3 ADDED requirements map to code (3/3). The design decisions (D1 gitignore-the-example, D2 named-enum accent in the design system, D3 shell badge; Q1 -> `primary`, Q2 -> shell badge) are honored; the builder is realized as `accentOverrides` + a single multi-theme `buildThemes` rather than the design's tentative `themeForAccent` name -- a documented, runtime-safer refinement, not a deviation. Scenario test coverage is 5/8 (0.625), below the 0.70 archive-gate threshold: one gap is the on-device re-skin (recorded as a satisfied Manual Action), one is structural (gitignored config, no logic to test), and one (badge updates on switch) is deferred with its mechanism already covered in `@aca/core`. No CRITICAL findings; 2 WARNING + 2 SUGGESTION, all deferred per the retroactive-backfill constraint (no new tests added). Status: READY_WITH_WARNINGS.
