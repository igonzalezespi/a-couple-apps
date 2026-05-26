## Why

Phase 7 adds a second app (`apps/plans`). Today two seams in the shared packages still know about a specific app: `@aca/core`'s `Database` type hard-codes the `movies` schema, and `@aca/i18n` carries the movies UI strings in its single translation bundle. A second app would either pollute these shared packages or fork them. This change generalizes both seams so an app composes its own schema types and registers its own translation namespace — making "add an app" a drop-in again, with no shared-package edits. It is the explicit prerequisite for the plans app.

## What Changes

- `@aca/core`: export a `BaseDatabase` (carrying only `public` + `shared`); make `createSupabaseClient<DB>` and `AppSupabaseClient<DB>` generic over the database shape (defaulting to `BaseDatabase`); thread the generic through the consumption boundary by making `useSupabase<DB>()` generic (the React context erases the generic, so the hook casts its return to `AppSupabaseClient<DB>`); remove the hard-coded `movies` block from core's `Database` type. Keep `Database` as a deprecated alias of `BaseDatabase` for back-compat, and export `BaseDatabase` from the `@aca/core` barrel.
- `apps/movies`: define a `MoviesDatabase` (= `BaseDatabase` + the `movies` schema), type its Supabase client with it, and call `useSupabase<MoviesDatabase>()` (via a tiny app-local `useMoviesSupabase`) at the watchlist hooks so `client.schema('movies')` stays typed.
- `@aca/i18n`: split translations into namespaces -- a shared `common` namespace in the package (registered as the default ns), plus a per-app `movies` namespace the app registers with i18next `fallbackNS: 'common'`; add a generic `useAppLocale(namespace)` returning `{ t, language, languages, setLanguage }` (with a movies-side `useMoviesLocale()` binding). Because the movies namespace falls back to `common`, the 44 movies `t()` call sites change by import, not by rewriting every key.
- Split the `en`/`es` locale files per namespace and split the compile-time key guard accordingly (`CommonTranslationKey` in `@aca/i18n`, `MoviesTranslationKey` in `apps/movies`, each `es` bundle typed `Record<...Key, string>`); update the i18n parity + `useLocale`/`useAppLocale` tests, add a movies-side parity test, and update the movies component string assertions.

## Capabilities

### New Capabilities

- `app-schema-typing`: apps compose their own typed Supabase `Database` from a shared `BaseDatabase`; `@aca/core` no longer hard-codes any app's schema.
- `app-i18n-namespaces`: shared `common` strings live in `@aca/i18n`; each app registers its own translation namespace (en/es).

### Modified Capabilities

- `data-and-auth` (core) and `i18n` (foundation): their public APIs gain generics / namespace registration, but no existing call site breaks — defaults preserve current behavior.

## Impact

- **Packages**: `@aca/core` (type + client + `useSupabase` generics; `BaseDatabase` exported, `Database` kept as a deprecated alias) and `@aca/i18n` (namespaces + `fallbackNS:'common'` + generic accessor). Both backward-compatible via defaults.
- **App**: `apps/movies` composes `MoviesDatabase`, calls `useSupabase<MoviesDatabase>()` at the watchlist hooks (preserving `client.schema('movies')` typing), and registers its `movies` namespace; call sites switch to `useMoviesLocale()` (a per-file import swap, made mechanical by `fallbackNS:'common'` resolving the shared keys).
- **Secrets / schema / backend**: none.
- **Test coverage**: core (the generic client + `useSupabase<DB>()` stay typed; defaults compile; `pnpm typecheck` green for `packages/core` and `apps/movies`), i18n (per-namespace parity + `useLocale`/`useAppLocale`), movies (per-namespace key guard + string assertions unchanged in meaning).
- **Rollback**: revert the generics + namespace split; the app re-inlines its schema/strings.
- **Sequencing**: land before `apps-plans` (Phase 7). The two parts (schema typing, i18n namespaces) are independent and can apply/merge separately.
- **Out of scope**: see `design.md` §Non-Goals.
