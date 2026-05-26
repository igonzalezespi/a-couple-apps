## 1. Movie detail view

- [ ] 1.1 `lib/tmdb.ts`: `getMovie(tmdbId)` using `resolveExternalLang` for the locale; typed result
- [ ] 1.2 `app/movie/[id].tsx` + `MovieDetailScreen` (poster, title, year, rating, overview, back)
- [ ] 1.3 Link search results + watchlist rows to `/movie/[id]`
- [ ] 1.4 Tests: TMDB details (mocked fetch, passes the configured language); detail renders; navigation from a row

## 2. Optimistic watched + undo-on-remove

- [ ] 2.1 `useSetWatched`: optimistic `onMutate` (snapshot + cache update) + `onError` rollback + `onSettled` invalidate
- [ ] 2.2 `useRemoveFromWatchlist`: optimistic remove + an undo affordance that restores the item within the window
- [ ] 2.3 Tests: optimistic flip + rollback on error; undo restores the removed item

## 3. Search-as-you-type

- [ ] 3.1 Debounce the query (~300ms) in `SearchScreen`; add a clear (X) control
- [ ] 3.2 Tests: the debounced query fires once after typing stops; clear empties the field + results

## 4. Settings screen

- [ ] 4.1 `app/settings.tsx` + `SettingsScreen`; move the language switch here; Home links to settings
- [ ] 4.2 i18n for settings / detail / undo strings (en + es)
- [ ] 4.3 Tests: settings renders + toggles language; Home links to settings

## 5. e2e + docs

- [ ] 5.1 Extend the Playwright web smoke: type-to-search -> open a detail -> back; the optimistic mark-watched still round-trips
- [ ] 5.2 CHANGELOG + ROADMAP (tick these Phase 6.5 items)

## Out of Scope

- **Trailers or streaming availability** -- the detail view shows TMDB overview/rating/year, not video or "where to watch". See design.md §Non-Goals.
- **Editing movie metadata** -- the list mirrors TMDB; no manual title/poster edits. See design.md §Non-Goals.
- **Full offline support** -- beyond the TanStack Query cache + realtime. See design.md §Non-Goals.
- **Plans app** -- Phase 7. See design.md §Non-Goals.
