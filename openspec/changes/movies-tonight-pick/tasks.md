## 1. Schema (`movies.watchlist_items`)

- [ ] 1.1 `supabase/migrations/0004_movies_tonight_pick.sql`: add `picked_at timestamptz null` + `picked_by text null`; CHECK both-null-or-both-set; `grant update (picked_at, picked_by) on movies.watchlist_items to anon`
- [ ] 1.2 Trigger function + trigger: setting `picked_at` clears every other row's pick (single pick); flipping `watched` true clears the row's own pick
- [ ] 1.3 Apply the migration to the live project; confirm via a manual set / clear / mark-watched that the invariants hold

## 2. Contract + types

- [ ] 2.1 Extend the watchlist row contract (`apps/movies/src/lib/watchlist.ts`) with `picked_at: z.string().nullable()` + `picked_by: z.string().nullable()`
- [ ] 2.2 Extend the movies `Database` type (`watchlist_items` Row/Insert/Update) with the two nullable fields

## 3. Hook + ordering

- [ ] 3.1 `useSetTonightPick` in `apps/movies/src/hooks/useWatchlist.ts`: set (this row `picked_at=now()`, `picked_by=currentPerson.id`) / clear (null both); invalidates `['watchlist_items']`
- [ ] 3.2 Order `useWatchlist` by `picked_at desc nulls last, created_at desc`
- [ ] 3.3 Hook tests: set sends the person id + timestamp; clear nulls both; ordering requested; success invalidates the query

## 4. UI + i18n

- [ ] 4.1 `Watchlist` to-watch rows get a "Pick for tonight" action; the picked row gets a "Tonight's pick" highlight + "Picked by {name}/you" and a "Clear" action
- [ ] 4.2 i18n keys `pickForTonight`, `tonightsPick`, `clearPick`, `pickedByYou`, `pickedByName` (en + es)
- [ ] 4.3 Component test: a picked item renders the highlight + attribution + clear; a normal item renders the pick action

## 5. e2e + docs

- [ ] 5.1 Extend the Playwright web smoke: pick an item -> it sorts first + shows "Tonight's pick" -> mark watched -> the pick clears
- [ ] 5.2 Add a Maestro step mirroring the pick / clear (maintainer machine)
- [ ] 5.3 CHANGELOG + ROADMAP note

## Out of Scope

- **Pick history** — no log of past picks or a "watched on" timeline; the pick is ephemeral state. See design.md §Non-Goals.
- **Per-person picks** — one shared pick for the couple, not one each. See design.md §Non-Goals.
- **Scheduling and reminders** — no date/time on a pick and no notifications. See design.md §Non-Goals.
- **Random or auto-pick** — a person always chooses; no shuffle or suggested pick. See design.md §Non-Goals.
- **Plans app** — `apps/plans` is its own change (Phase 7). See design.md §Non-Goals.
