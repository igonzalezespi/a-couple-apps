# Verify Report: apps-movies

**Change**: `apps-movies`
**Verified**: `2026-05-26T20:37:44Z`
**Status**: `READY_WITH_WARNINGS`
**Schema**: `spec-driven`
**Iterations**: `1`
**Dry Run**: `false`

## Scorecard

| Dimension    | Metric                      | Value            | Threshold |
| ------------ | --------------------------- | ---------------- | --------- |
| Completeness | Tasks complete              | `17/18`          | --        |
| Completeness | Requirements covered        | `5/5`            | `>= 0.80` |
| Correctness  | Scenarios covered by tests  | `6/7`            | `>= 0.70` |
| Correctness  | Requirements mapped to code | `5/5`            | --        |
| Coherence    | Design decisions followed   | `5/6 partial`    | --        |
| Coherence    | Pattern consistency         | `aligned`        | --        |

## Findings

### CRITICAL

_None_

### WARNING

- **[cc806085]** `Authenticated access` requirement is obsolete; the app ships no-login person selection -- `openspec/changes/apps-movies/specs/movie-watchlist/spec.md:3-18`
  - **Dimension**: correctness
  - **Kind**: spec_divergence
  - **Detail**: The delta spec's first requirement mandated Supabase email-OTP auth, a sign-in screen, and `useSession`. Auth was removed in commit 97e0eb5 (`feat(movies)!: replace auth with no-login person selection`) and the canonical spec `openspec/specs/movie-watchlist/spec.md:9-24` and `openspec/specs/data-and-auth/spec.md` already describe the no-auth, person-selection model. The shipped code (`apps/movies/src/PersonGate.tsx`, `apps/movies/app/_layout.tsx:25-28`, `packages/core/src/person.tsx`) is correct; only the historical delta spec was stale.
  - **Recommendation**: Replace the `Authenticated access` requirement with the canonical `Person selection (no sign-in)` requirement so the delta matches reality.
  - **Auto-fix eligible**: yes (warning_spec_divergence_code_correct -- code correct, delta spec updated; see Spec Drift Resolutions and Fixes Applied During Verify)
- **[823c72a3]** RLS / anon-scoped access scenario has no automated test -- `supabase/migrations/0002_movies_schema.sql:23-49`
  - **Dimension**: correctness
  - **Kind**: scenario_uncovered
  - **Detail**: The `Shared watchlist` requirement's RLS scenario (only the couple's own list is readable/writable; `added_by` not rewritable via the column-scoped update grant) is enforced purely at the database layer in `0002_movies_schema.sql` and has no Vitest/Playwright coverage. RLS and grant behaviour are not exercisable from the hermetic, fully-stubbed component/e2e suites.
  - **Recommendation**: Add a DB-level integration check (e.g. a migration smoke test against a local Supabase) asserting anon read/write and the column-scoped update grant. Out of scope for a backfill (shipped + gate-green).
  - **Auto-fix eligible**: no (backfill verify -- new tests are out of scope; the RLS contract is DB-level and not coverable by the existing hermetic suites)

### SUGGESTION

_None_

## Fixes Applied During Verify

- **[cc806085]** Replaced obsolete `Authenticated access` requirement with `Person selection (no sign-in)`
  - **Originally**: WARNING
  - **Dimension / Kind**: correctness / spec_divergence
  - **Problem**: The delta spec still required Supabase email-OTP auth + a sign-in gate, which was removed in commit 97e0eb5; the shipped code uses no-login person selection and the canonical spec already reflects that.
  - **Fix applied**: Rewrote the requirement and its two scenarios in the delta spec to the canonical `Person selection (no sign-in)` wording (person picker gate, persisted + switchable selection), matching `apps/movies/src/PersonGate.tsx` and `packages/core/src/person.tsx`.
  - **Files touched**: `openspec/changes/apps-movies/specs/movie-watchlist/spec.md:3-16`
  - **Verified by**: manual-replay (delta spec now mirrors canonical `openspec/specs/movie-watchlist/spec.md:9-24`; implementation re-read)
  - **Iteration**: 1

## Deferred Work

### Deferred 1: Add a DB-level test for movies RLS + column-scoped grants

- **Origin**: WARNING from correctness / scenario_uncovered
- **Finding ID**: 823c72a3
- **Why deferred**: out of scope (retroactive backfill of shipped, gate-green code; RLS is a DB-level contract not coverable by the existing hermetic component/e2e suites)
- **Affected files**: `supabase/migrations/0002_movies_schema.sql`, `apps/movies/src/hooks/useWatchlist.ts`

**Propose command**:

```
/opsx:propose movies-rls-db-test
> Add an integration test that applies 0002_movies_schema.sql to a local Supabase and asserts the anon role can read/insert/delete watchlist_items, that UPDATE is column-scoped (watched/pick columns writable, added_by not rewritable), and that the table is in the supabase_realtime publication. Covers the currently untested RLS / anon-scoped access scenario.
```

## Manual Actions Required

### Manual 1: Device verification of the watchlist + realtime between two sessions

- **Category**: human-judgment
- **Finding ID**: 8d499a33
- **Why agent cannot verify**: Task 9.3 requires two live app sessions against a real Supabase project to confirm that a change by one person propagates to the other without a manual refresh. This needs real devices/emulators and a live backend, which the agent cannot drive; realtime is stubbed in the hermetic Playwright/Vitest suites.
- **Context**: Performed by the maintainer -- realtime confirmed working in the live DB. Recorded as a SATISFIED maintainer check (pass criteria met); task 9.3 stays `[ ]` because it is a human-judgment check, not code-evidenced.
- **Pass criteria**: With two sessions open as different people, an add / mark-watched / remove / tonight-pick by one session appears in the other within a few seconds with no manual refresh; unmounting the watchlist screen unsubscribes the channel.
- **Owner**: human

## Spec Drift Resolutions

- **[cc806085]** Authenticated access -> Person selection (no sign-in)
  - **Drift**: The delta spec required Supabase email-OTP authentication, a sign-in screen, and session persistence via `useSession`. The shipped app has no auth: it gates on a locally-selected, persisted, switchable person (`apps/movies/src/PersonGate.tsx`, `packages/core/src/person.tsx`), matching the canonical specs.
  - **Resolution**: delta spec updated at `openspec/changes/apps-movies/specs/movie-watchlist/spec.md:3-16` to the canonical `Person selection (no sign-in)` requirement and its two scenarios.
  - **Iteration**: 1

## Test Compliance

**Summary**: 7 scenarios extracted, 16 test files / 54 tests discovered for this change (7 in `apps/movies/**`), 4 high-confidence matches, 2 medium, 0 low, 1 orphan group, 1 gap.

| Requirement | Scenario | Coverage | Matching Test | Confidence | Notes |
|-------------|----------|----------|---------------|------------|-------|
| Person selection (no sign-in) | Person-selection gate | covered | `apps/movies/e2e/movies.spec.ts:141-144` | medium | E2E starts with no stored selection and shows the person picker; no dedicated `PersonGate` unit test (gate logic also exercised via `apps/movies/src/CurrentPersonBadge.test.tsx:15`). |
| Person selection (no sign-in) | Selected entry | covered | `apps/movies/e2e/movies.spec.ts:144-147` | medium | After picking a person the watchlist/home renders; `apps/movies/src/HomeScreen.test.tsx:27` asserts the Switch-person action. |
| Configured-language movie search | Search uses the configured language | covered | `apps/movies/src/lib/tmdb.test.ts:42`, `apps/movies/src/lib/tmdb.test.ts:75` | high | Asserts `language=es-ES` for `es` and `language=en-US` for `en`. |
| Shared watchlist | Add, mark watched, remove | covered | `apps/movies/src/hooks/useWatchlist.test.tsx:129`, `apps/movies/src/Watchlist.test.tsx:74-88`, `apps/movies/e2e/movies.spec.ts:161-176` | high | Add attributes to current person; mark-watched and remove call the right queries and invalidate the cache; e2e round-trips the full journey. |
| Shared watchlist | Couple-scoped access (RLS) | gap | -- | -- | DB-level RLS + column-scoped grant in `0002_movies_schema.sql`; no automated test. Finding 823c72a3 (deferred). |
| Realtime sync between the two users | A change propagates live | covered | `apps/movies/src/hooks/useWatchlist.test.tsx:313-348` | high | Simulated realtime change invalidates `['watchlist_items']`; unmount removes the channel. |
| Cross-platform UI from the design system | Renders on web from shared primitives | covered | `apps/movies/src/HomeScreen.test.tsx:22`, `apps/movies/src/Watchlist.test.tsx:67`, `apps/movies/src/SearchScreen.test.tsx:69` | high | All screens render via the RN-Web alias from `@aca/ui` primitives. Native-target compile is verified on device (Manual 1) rather than by tests. |

**Orphan tests**: tests covering capabilities owned by later changes rather than `apps-movies` scenarios -- tonight's pick (`apps/movies/src/hooks/useWatchlist.test.tsx:176-204`, `apps/movies/src/Watchlist.test.tsx:120-145`; `movies-tonight-pick`), per-person attribution/color and the persistent identity badge (`apps/movies/src/Watchlist.test.tsx:106-118`, `apps/movies/src/CurrentPersonBadge.test.tsx`; `couple-personalization`), and duplicate-add / loading / empty / error polish (`apps/movies/src/SearchScreen.test.tsx:103-199`; `movies-watchlist-polish`). Not gaps for this change.

**Gaps**: 1 -- the RLS / anon-scoped access scenario (Shared watchlist) has no automated test (finding 823c72a3, WARNING, deferred). 6/7 scenarios covered (0.86), above the 0.70 threshold.

## Final Assessment

All 18 tasks are implemented (17 checkboxes `[x]`; task 9.3 is a maintainer device check recorded as a SATISFIED Manual Action, finding 8d499a33). All 5 delta-spec requirements map to shipped code and the full Vitest + Playwright suite is green (54/54). One WARNING was auto-fixed: the obsolete `Authenticated access` requirement was reconciled to the canonical `Person selection (no sign-in)` reality (spec drift cc806085). One WARNING defers: the DB-level RLS / anon-scoped access scenario (823c72a3) has no automated test, which is acceptable for a retroactive backfill of shipped, gate-green code where new tests are out of scope. 0 CRITICAL, 2 WARNING (1 fixed, 1 deferred), 0 SUGGESTION, 1 deferred work item, 1 manual action. READY_WITH_WARNINGS -- safe to archive once the manual realtime check is acknowledged.
