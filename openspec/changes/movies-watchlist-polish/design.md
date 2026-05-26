## Context

The movies app has `home` + `search` routes, a shared realtime watchlist (now with a tonight's pick), and the language toggle on Home. TMDB search exists (`lib/tmdb.ts`); there is no movie-details fetch, no detail route, no settings screen, and mutations are non-optimistic (a watched toggle waits for the round-trip before the UI updates).

## Goals / Non-Goals

**Goals:**

- Read about a movie before deciding; instant, safe interactions; cleaner search and a real settings home.
- Reuse the existing data boundary (`@aca/core` hooks) and design system; no schema change.

**Non-Goals:**

- **Trailers or streaming availability** -- the detail view shows TMDB overview/rating/year, not video or "where to watch".
- **Editing movie metadata** -- the list mirrors TMDB; no manual title/poster edits.
- **Full offline support** -- beyond the TanStack Query cache + realtime.
- **Plans app** -- Phase 7.

## Decisions

### D1: Detail via a `/movie/[id]` route fed by TMDB details

Add `getMovie(tmdbId)` to `lib/tmdb.ts` (configured language via `resolveExternalLang`), a `MovieDetailScreen`, and an `app/movie/[id].tsx` route. Search results and watchlist rows link to it.
**Why**: a dedicated route is the idiomatic Expo Router approach; the details endpoint gives overview/rating that search results lack.
**Alternative considered**: an inline expandable row. Rejected -- a route is shareable, deep-linkable, and roomier for the overview.

### D2: Optimistic mutations with rollback; undo-on-remove

`useSetWatched` / `useRemoveFromWatchlist` use TanStack Query `onMutate` (cancel + snapshot + optimistic cache update), `onError` (rollback), and `onSettled` (invalidate so server + realtime truth wins). Remove shows a transient undo that restores the item before the delete is final (or optimistic-remove + undo re-insert).
**Why**: instant feedback on a shared list; rollback + invalidation keep it consistent with realtime.
**Alternative considered**: confirmation dialog before remove. Rejected -- an undo is lower-friction and the established safe-delete pattern.

### D3: Settings screen owns the language switch

Move the language toggle from Home into `app/settings.tsx`; Home links to settings. Settings is the natural home for switch-person and (later) the per-person color from `couple-personalization`.
**Why**: declutters Home; gives preferences a real place as the app grows.

## Risks / Trade-offs

- **Optimistic + realtime** -> `onSettled` invalidation reconciles optimistic state with the server/realtime truth; snapshot+rollback covers errors.
- **Undo timing across two devices** -> keep undo local UI; the delete commits after the undo window, so the partner sees the final state.
- **TMDB details locale/rate** -> reuse `resolveExternalLang`; cache per `['movie', id]` query key.

## Migration Plan (implementation slices)

1. **Detail** -- `getMovie` + `/movie/[id]` + links from search/watchlist.
2. **Optimistic + undo** -- optimistic watched, undo-on-remove.
3. **Search-as-you-type** -- debounce + clear.
4. **Settings** -- settings screen + move the language switch + Home link.

Each slice is its own commit, verified before the next.

## Open Questions

- **Q1**: Undo as a snackbar/toast vs. an inline control? Proposal: a simple transient inline/snackbar undo for a few seconds.
- **Q2**: Detail reachable from watched items too? Proposal: yes -- any watchlist row and any search result.
