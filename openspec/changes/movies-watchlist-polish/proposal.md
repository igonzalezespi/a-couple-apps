## Why

Phase 6.5's remaining movies-UX items make the watchlist faster and more decision-friendly: read about a movie before committing (detail view), instant feedback with a safe undo (optimistic toggle + undo-on-remove), and smoother search plus a real home for settings. These are the last "couple-friendly v1" touches on the movies app before the plans app.

## What Changes

- **Movie detail view** (`/movie/[id]`): overview, rating, year, poster -- reachable from search results and watchlist rows -- so a couple can choose from the list.
- **Optimistic watched toggle + undo-on-remove**: marking watched flips instantly (optimistic, rolls back on error); removing offers an undo so a shared delete is safe.
- **Search-as-you-type + clear + settings screen**: search debounces as you type and gains a clear control; the language switch moves off Home into a real Settings screen (`/settings`).

## Capabilities

### New Capabilities

- `movie-detail`: a detail screen (TMDB overview/rating/year) reachable from search and the watchlist.
- `watchlist-optimistic-updates`: instant watched toggle (optimistic, with rollback) + undo-on-remove.
- `search-and-settings`: debounced search-as-you-type + a clear control; a settings screen owning the language switch.

### Modified Capabilities

- `movie-watchlist`: rows and search results link to the detail view; watched/remove become optimistic; the language switch relocates from Home to settings.

## Impact

- **New:** routes `app/movie/[id].tsx`, `app/settings.tsx`; `MovieDetailScreen`, `SettingsScreen`; a TMDB details fetch + a debounce helper in `lib/tmdb.ts`.
- **Hooks:** `useSetWatched` / `useRemoveFromWatchlist` gain optimistic `onMutate` + rollback; an undo affordance for remove.
- **i18n:** detail / settings / undo strings (en/es).
- **Schema / secrets / backend:** none.
- **Test coverage:** TMDB details (mocked fetch), optimistic hook behavior (rollback), the debounce, detail + settings components, and an e2e search-as-you-type -> open-detail step.
- **Out of scope:** see `design.md` §Non-Goals.
