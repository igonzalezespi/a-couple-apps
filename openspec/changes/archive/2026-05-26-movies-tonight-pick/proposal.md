## Why

The watchlist answers "what could we watch"; it does not answer "what are we watching tonight". A couple still has to talk it out to converge on one title. A single shared "Tonight's pick" closes that loop: either partner flags one item, it surfaces to the top for both in realtime, and it clears itself once the night is over (the movie is marked watched or removed). It is a small, high-signal addition that rides the existing shared watchlist, RLS (`anon`), and realtime plumbing — no new backend surface.

## What Changes

- Add `supabase/migrations/0004_movies_tonight_pick.sql`: two nullable columns on `movies.watchlist_items` (`picked_at timestamptz`, `picked_by text`), a CHECK that they are both null or both set, an `anon` column-scoped UPDATE grant, and a trigger that (a) clears any other row's pick when one is set (at most one pick) and (b) clears the pick when the row is marked watched.
- Extend the watchlist row contract + the movies `Database` type with `picked_at` / `picked_by`.
- Add a `useSetTonightPick` hook (set / clear) and order the watchlist so the pick floats to the top.
- UI: a "Pick for tonight" action on each to-watch item and a highlighted "Tonight's pick" treatment that shows which person set it.
- i18n: `pickForTonight`, `tonightsPick`, `clearPick`, `pickedByYou`, `pickedByName` (en/es).
- Tests: contract (the new columns), hook (ordering + set/clear + realtime invalidation), component (the highlight + the pick/clear actions).

## Capabilities

### New Capabilities

- `movie-tonight-pick`: a single shared, realtime "Tonight's pick" over the existing watchlist that auto-clears when the chosen movie is watched or removed, attributed to the person who set it.

### Modified Capabilities

- `movie-watchlist`: the watchlist query gains a pick-first ordering and its row contract gains two optional fields. Purely additive — no existing requirement's behavior is removed; the new behavior is captured as ADDED requirements under `movie-tonight-pick`.

## Impact

- **New files**: `supabase/migrations/0004_movies_tonight_pick.sql`; pick hook + UI + i18n keys + tests in `apps/movies`.
- **Schema**: two nullable columns + CHECK + trigger + an `anon` column-scoped UPDATE grant on `movies.watchlist_items`. Additive; existing rows get null picks.
- **Shared packages**: consumed unchanged (the row contract lives in the app).
- **Secrets**: none new.
- **Realtime**: no new wiring — the existing `movies`-schema subscription already invalidates the watchlist on these UPDATEs.
- **Identity**: reuses the no-auth person model; `picked_by` is a `couple.config` person id (text), like `added_by`.
- **Test coverage**: contract + hook + component (Vitest); the Playwright web smoke gains a pick/clear step; a Maestro step on the maintainer's machine.
- **Rollback**: drop the trigger + columns (down migration); remove the hook/UI/i18n keys.
- **Out of scope**: see `design.md` §Non-Goals.
