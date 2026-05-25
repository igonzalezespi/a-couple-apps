## Context

The movies app ships a shared, realtime watchlist (the `movie-watchlist` capability): either partner adds TMDB results, both see the list live, items can be marked watched or removed. There is no auth — identity is the locally-selected `couple.config` person, and inserts carry `added_by` (a person id, text). RLS scopes the `movies` schema to the `anon` role; a `movies`-schema realtime subscription invalidates the watchlist query on any change. Picking what to actually watch tonight still happens out-of-band. This change adds one shared "Tonight's pick" on top of that watchlist, reusing its schema, hooks, RLS, and realtime subscription.

## Goals / Non-Goals

**Goals:**

- One shared pick for the couple, visible to both in realtime, that floats to the top of the watchlist.
- The pick auto-clears when its movie is marked watched or removed — no stale "tonight" left over.
- Attribution: show which person set the pick (reusing the person model), e.g. "Picked by Person A".
- DB-enforced invariants (at most one pick; clear-on-watched) so both clients stay consistent without client coordination.

**Non-Goals:**

- **Pick history** — no log of past picks or a "watched on" timeline; the pick is ephemeral state, not an event stream.
- **Per-person picks** — there is one shared pick for the couple, not one each; this answers "what are *we* watching".
- **Scheduling and reminders** — no date/time on a pick and no notifications; "tonight" is implicit.
- **Random or auto-pick** — a person always chooses; no shuffle or suggested pick (a possible future change).
- **Plans app** — unrelated; `apps/plans` is its own change (Phase 7).

## Decisions

### D1: Represent the pick as nullable columns on `watchlist_items`, not a separate table

Store `picked_at timestamptz null` + `picked_by text null` on `movies.watchlist_items`, guarded by a CHECK (both null or both set). The pick is a property of a watchlist row, so it rides the existing row query, RLS, `anon` grants, and the `movies`-schema realtime subscription with zero new plumbing.
**Why**: minimal surface; the existing realtime invalidation already refreshes the watchlist on any row UPDATE, so a pick change syncs for free.
**Alternative considered**: a one-row `movies.tonight_pick` table referencing the item. Rejected — a second table needs its own RLS, grants, realtime publication entry, and a join, for no gain over a flag on the row.

### D2: At most one pick, enforced by a trigger

A trigger clears every other row's pick when a row's `picked_at` is set, so "one pick" holds even if both partners pick near-simultaneously.
**Why**: a DB-enforced single pick is race-safe; a client-side "clear others then set" is not (two devices can interleave).
**Alternative considered**: client-side clear-then-set in the hook. Rejected for the race; the trigger is authoritative.

### D3: Auto-clear on watched via the same trigger; remove is inherent

When a row's `watched` flips to true, the trigger nulls its `picked_at` / `picked_by`. Removing the row drops the pick with it. So "tonight" never outlives the movie.
**Why**: the clearing rule belongs in the DB so it holds regardless of which client (or a manual edit) flips `watched`.

### D4: Pick-first ordering

`useWatchlist` orders by `picked_at desc nulls last, created_at desc`, so the pick (at most one) sits at the top, then the rest newest-first as today.
**Why**: the pick should be the first thing both partners see; no separate query needed.

### D5: Either partner sets or clears the pick

The pick is shared, so the `anon` UPDATE grant covers `picked_at` / `picked_by` (column-scoped, like `watched`), and either person can set or clear it. `picked_by` records who set it for attribution, not for permission — consistent with `added_by`, which the existing column grant already protects from being overwritten.

## Risks / Trade-offs

- **Trigger complexity** -> keep it one small function with two guarded branches (set-clears-others; watched-clears-self); cover with the hook/integration tests.
- **Column-grant drift** -> follow the existing `watched`-column grant pattern so attribution (`added_by`) still cannot be overwritten.
- **Realtime echo** -> setting a pick UPDATEs two rows (the new pick + the previously picked); both invalidate the same query key, which de-dupes at the TanStack Query layer. Acceptable.

## Migration Plan (implementation slices)

1. **Schema** — the `0004` migration (columns + CHECK + grant + trigger); apply to the live DB; extend the `Database` type + row contract.
2. **Hook + ordering** — `useSetTonightPick` (set/clear) + the watchlist ordering; hook tests.
3. **UI + i18n** — pick/clear actions + the highlighted treatment + strings; component test.
4. **e2e** — extend the Playwright web smoke (pick -> sorts first -> mark watched -> pick clears) and the Maestro flow.

Each slice is its own commit, verified before the next.

## Open Questions

- **Q1**: Should clearing happen on *unwatch* too? Proposal: no — unwatch just restores a normal to-watch item; the pick stays cleared.
- **Q2**: Show the pick's `picked_at` time in the UI? Proposal: no — just the highlight + who set it; the timestamp adds noise.
