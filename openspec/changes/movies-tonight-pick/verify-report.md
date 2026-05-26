# Verify Report: movies-tonight-pick

**Change**: `movies-tonight-pick`
**Verified**: `2026-05-26T20:37:36Z`
**Status**: `READY_WITH_WARNINGS`
**Schema**: `spec-driven`
**Iterations**: `1`
**Dry Run**: `false`

## Scorecard

| Dimension    | Metric                      | Value            | Threshold |
| ------------ | --------------------------- | ---------------- | --------- |
| Completeness | Tasks complete              | `13/13`          | --        |
| Completeness | Requirements covered        | `3/3`            | `>= 0.80` |
| Correctness  | Scenarios covered by tests  | `6/8`            | `>= 0.70` |
| Correctness  | Requirements mapped to code | `3/3`            | --        |
| Coherence    | Design decisions followed   | `5/5`            | --        |
| Coherence    | Pattern consistency         | `aligned`        | --        |

## Findings

### CRITICAL

_None_

### WARNING

- **[032ae2a8]** "Removing the pick" scenario has no automated test -- `apps/movies/src/hooks/useWatchlist.ts:60-70`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: The delta-spec scenario "Removing the pick" (spec.md:39-44) asserts that deleting the picked row leaves no pick. `useRemoveFromWatchlist` is tested for the delete-by-id path (`useWatchlist.test.tsx:152-162`), but no test asserts the post-condition that no item remains the pick after a remove. The behavior is inherent (the row carrying the pick is gone), so it is correct, but unasserted.
  - **Recommendation**: Add a hook or component test that removes the picked row and asserts the rendered list shows no "Tonight's pick" treatment.
  - **Auto-fix eligible**: no (retroactive backfill verify; adding tests is out of scope -- deferred)
- **[33cd4962]** "Marking the pick watched" trigger has no automated regression test -- `supabase/migrations/0004_movies_tonight_pick.sql:19-35`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: The `clear_pick_when_watched` trigger nulls `picked_at`/`picked_by` when `watched` flips true (scenario "Marking the pick watched", spec.md:32-37). The Playwright web smoke covers this end-to-end (`apps/movies/e2e/movies.spec.ts:174-177`), but against a hand-rolled fake that re-implements the trigger (`movies.spec.ts:110-122`), not the real SQL. The trigger itself has no unit/integration test against a live or local Postgres, so a regression in the migration would not be caught by `pnpm test`.
  - **Recommendation**: Add an integration test (pgTAP or a Supabase local-stack test) that sets a pick, flips `watched`, and asserts both pick columns are null.
  - **Auto-fix eligible**: no (DB-trigger coverage; exercised by the live migration but not unit-tested -- deferred per backfill rules)
- **[4e633ea0]** "Only one pick at a time" trigger has no automated regression test -- `supabase/migrations/0004_movies_tonight_pick.sql:41-60`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: The `clear_other_picks` trigger enforces the single-pick invariant (scenario "Only one pick at a time", spec.md:14-19). The Playwright web smoke exercises a "pick A then pick B" flow through a fake that emulates the cascade (`movies.spec.ts:110-117`); the real trigger SQL has no unit/integration test, so a regression in the DB function would pass `pnpm test`. The invariant is enforced server-side and was confirmed by the manual apply in task 1.3, but is unguarded by CI.
  - **Recommendation**: Add an integration test that picks two rows in sequence and asserts exactly one row has a non-null `picked_at`.
  - **Auto-fix eligible**: no (DB-trigger coverage; exercised by the live migration but not unit-tested -- deferred per backfill rules)
- **[fda2e955]** "Attribution to the setter" scenario has no component test -- `apps/movies/src/Watchlist.tsx:57-61`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: The scenario "Attribution to the setter" (spec.md:57-62) requires the pick to read "you" for the current person and the configured name otherwise. `pickedByFor` (Watchlist.tsx:57-61) implements this and the picked-row badge renders it (Watchlist.tsx:130-134), but the only pick component test (`Watchlist.test.tsx:134-145`) asserts the "Tonight's pick" treatment and the clear action -- not the "you" / "{name}" attribution branch. The analogous `added_by` attribution is tested (`Watchlist.test.tsx:106-118`); the `picked_by` branch is not.
  - **Recommendation**: Add a component test rendering a picked item as the setter (expects "...you") and as the partner (expects "...{name}").
  - **Auto-fix eligible**: no (retroactive backfill verify; adding tests is out of scope -- deferred)

### SUGGESTION

- **[1d52f7b6]** `useSetTonightPick` silently clears when no person is selected -- `apps/movies/src/hooks/useWatchlist.ts:92-95`
  - **Dimension**: coherence
  - **Kind**: pattern_deviation
  - **Detail**: When called with `pick: true` but `person` is null, the ternary `pick && person ? {...} : { picked_at: null, picked_by: null }` falls through to the clear branch, so a "set" request with no selected person becomes a no-op clear rather than an error or guarded skip. In practice the UI only renders the pick action once a person is chosen, so this path is currently unreachable, but the intent ("set requires a person") is implicit. `useAddToWatchlist` (useWatchlist.ts:52) handles the missing-person case with an explicit `...(person ? {...} : {})` spread that omits the attribution rather than reinterpreting the action.
  - **Recommendation**: Add a one-line `// reason:` note that a missing person degrades a set into a clear (unreachable from the UI), or early-return when `pick && !person`.
  - **Auto-fix eligible**: no (touches mutation control flow / would change behavior; > a single lint-fixable line -- deferred)

## Fixes Applied During Verify

_None_

<!--
  No auto-fixes applied. All 13 tasks were already `[x]` with repo evidence
  (confirmed in Completeness below), so no `incomplete_task` checkbox flips
  were needed. The delta spec matched the implementation (no `spec_divergence`),
  so no Spec Drift Resolutions were required. All remaining findings are
  scenario_uncovered / pattern_deviation, which are not auto-fix eligible under
  a retroactive backfill (adding tests and changing control flow are out of
  scope) -- they are deferred.
-->

## Deferred Work

### Deferred 1: Test the "removing the pick" post-condition

- **Origin**: WARNING from correctness / scenario_uncovered
- **Finding ID**: 032ae2a8
- **Why deferred**: out of scope (retroactive backfill verify does not add tests)
- **Affected files**: `apps/movies/src/Watchlist.test.tsx`, `apps/movies/src/hooks/useWatchlist.test.tsx`

**Propose command**:

```
/opsx:propose movies-tonight-pick-remove-test
> Add a test covering the "Removing the pick" scenario: remove the picked row and assert no item renders the "Tonight's pick" treatment afterwards. Closes the scenario_uncovered gap in apps/movies/src/Watchlist.test.tsx.
```

### Deferred 2: Integration-test the tonight-pick DB triggers

- **Origin**: WARNING from correctness / scenario_uncovered
- **Finding ID**: 33cd4962
- **Why deferred**: needs design (requires a DB integration-test harness -- pgTAP or Supabase local stack -- that the repo does not yet have)
- **Affected files**: `supabase/migrations/0004_movies_tonight_pick.sql`, `supabase/tests/` (new)

**Propose command**:

```
/opsx:propose movies-pick-trigger-tests
> Stand up a Postgres integration-test harness (pgTAP or Supabase local stack) and cover the two tonight-pick triggers against real SQL: clear_pick_when_watched nulls the pick when watched flips true, and clear_other_picks keeps exactly one pick when two rows are picked in sequence. Today only a hand-rolled Playwright fake emulates them.
```

### Deferred 3: Integration-test the single-pick invariant

- **Origin**: WARNING from correctness / scenario_uncovered
- **Finding ID**: 4e633ea0
- **Why deferred**: needs design (same missing DB integration-test harness as Deferred 2)
- **Affected files**: `supabase/migrations/0004_movies_tonight_pick.sql`, `supabase/tests/` (new)

**Propose command**:

```
/opsx:propose movies-single-pick-invariant-test
> Add a DB integration test for the "Only one pick at a time" invariant: pick row A, then pick row B, and assert exactly one row has a non-null picked_at (the clear_other_picks trigger). Pairs with the trigger-harness work in movies-pick-trigger-tests.
```

### Deferred 4: Component-test pick attribution branches

- **Origin**: WARNING from correctness / scenario_uncovered
- **Finding ID**: fda2e955
- **Why deferred**: out of scope (retroactive backfill verify does not add tests)
- **Affected files**: `apps/movies/src/Watchlist.test.tsx`

**Propose command**:

```
/opsx:propose movies-pick-attribution-test
> Add component tests for the picked-item attribution branch (pickedByFor): rendering as the setter shows the "you" string, rendering as the partner shows the configured name. Mirrors the existing added_by attribution tests.
```

### Deferred 5: Clarify set-with-no-person behavior in useSetTonightPick

- **Origin**: SUGGESTION from coherence / pattern_deviation
- **Finding ID**: 1d52f7b6
- **Why deferred**: requires human judgment (decide between a guard, an error, or a documented degrade-to-clear)
- **Affected files**: `apps/movies/src/hooks/useWatchlist.ts`

**Propose command**:

```
/opsx:propose movies-pick-no-person-guard
> In useSetTonightPick, a pick:true call with no selected person currently degrades to a clear (the pick && person ternary). Either early-return/guard that case or add a // reason note documenting the unreachable-from-UI degrade, matching the explicit missing-person handling in useAddToWatchlist.
```

## Manual Actions Required

_None_

<!--
  DB-trigger behavior (single-pick, clear-on-watched) is exercised by the live
  migration and was confirmed by the manual set/clear/mark-watched check in task
  1.3. Per the backfill rules, the absence of an *automated* regression test for
  those triggers is recorded as deferred scenario_uncovered findings (33cd4962,
  4e633ea0), not as a standing manual action. No item here requires a human to
  verify on an ongoing basis (no visual-only, third-party, secrets, or hardware
  check is introduced by this change).
-->

## Spec Drift Resolutions

_None_

<!--
  The delta spec at openspec/changes/movies-tonight-pick/specs/movie-tonight-pick/spec.md
  matches the shipped implementation; no drift edits were needed. Note: the i18n
  strings render attribution as "Chosen by you" / "Chosen by {{name}}"
  (packages/i18n/src/locales/en.ts:37-38) rather than the proposal's example
  wording "Picked by". The spec requirement only mandates that the UI "show which
  person set it" with "you" for the current person and the configured name
  otherwise (spec.md:46-48) -- which the shipped strings satisfy. This is a
  wording choice in the example, not a spec divergence, so no delta-spec edit
  applies.
-->

## Test Compliance

**Summary**: 8 scenarios extracted, 34 tests discovered across 3 unit files (+ 1 Playwright e2e, + 1 Maestro flow), 5 high-confidence matches, 1 medium, 0 low, 0 orphan tests, 2 gaps.

| Requirement                          | Scenario                  | Coverage  | Matching Test                                              | Confidence | Notes                                                                                          |
| ------------------------------------ | ------------------------- | --------- | --------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------- |
| Single shared Tonight's pick         | Setting a pick            | covered   | `apps/movies/src/hooks/useWatchlist.test.tsx:176-192`     | high       | Hook asserts `picked_by` = person id + `picked_at` timestamp; component test at L126-132.      |
| Single shared Tonight's pick         | Only one pick at a time   | covered   | `apps/movies/src/e2e/movies.spec.ts:170` (fake emulation) | medium     | e2e exercises pick-then-pick through a fake that re-implements `clear_other_picks`; real trigger SQL untested (finding 4e633ea0). |
| Single shared Tonight's pick         | Clearing a pick           | covered   | `apps/movies/src/hooks/useWatchlist.test.tsx:194-204`     | high       | Hook asserts both columns null; component clear action at L134-145.                            |
| Pick auto-clears when its movie done | Marking the pick watched  | covered   | `apps/movies/e2e/movies.spec.ts:174-177` (fake emulation) | medium     | e2e marks watched and asserts the pick treatment disappears via a fake; real trigger untested (finding 33cd4962). |
| Pick auto-clears when its movie done | Removing the pick         | gap       | _none_                                                    | --         | `useRemoveFromWatchlist` delete path tested (L152-162); no test asserts the pick clears on remove (finding 032ae2a8). |
| Pick surfaces first with attribution | Pick floats to the top    | covered   | `apps/movies/src/hooks/useWatchlist.test.tsx:121-125`     | high       | Asserts both `.order(...)` calls (picked_at desc nulls-last, then created_at desc).            |
| Pick surfaces first with attribution | Pick floats to the top (treatment) | covered | `apps/movies/src/Watchlist.test.tsx:134-142`           | high       | Asserts the picked row renders the distinct "Tonight's pick" treatment.                        |
| Pick surfaces first with attribution | Attribution to the setter | gap       | _none_                                                    | --         | `pickedByFor` implemented (Watchlist.tsx:57-61) and rendered (L130-134); no test for the "you"/"{name}" branch (finding fda2e955). |

**Orphan tests**: _None_ -- every tonight-pick test maps to a scenario. (The error-state and invalidation hook tests at `useWatchlist.test.tsx:206-310` belong to the parent `movie-watchlist` capability, not this change's delta scenarios.)

**Gaps**: 2 scenarios with no matching test -- "Removing the pick" (032ae2a8, WARNING) and "Attribution to the setter" (fda2e955, WARNING). Both deferred. Two further scenarios ("Only one pick at a time", "Marking the pick watched") are covered only by a Playwright fake that re-implements the triggers rather than the real SQL, recorded as scenario_uncovered (4e633ea0, 33cd4962) for a future DB integration-test harness.

## Final Assessment

All 13 tasks are complete with repo evidence, all 3 delta-spec requirements map to shipped code (migration `0004`, the `useSetTonightPick` hook plus pick-first ordering, the `Watchlist` highlight/attribution UI, the contract + `Database` type, and the en/es i18n keys), and all 5 design decisions (D1 columns-not-table, D2 single-pick trigger, D3 clear-on-watched, D4 pick-first ordering, D5 either-partner column grant) are followed. Scenario-by-test coverage is 6/8 (0.75), clearing the 0.70 threshold; the two true gaps and the two trigger-only-emulated scenarios are deferred as four `scenario_uncovered` warnings, plus one coherence suggestion about the set-with-no-person degrade. No CRITICAL findings, no spec drift, no standing manual actions. Status: READY_WITH_WARNINGS -- safe to archive; the deferred test gaps become follow-up issues.
