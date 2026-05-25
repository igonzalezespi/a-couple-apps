## Why

Phase 7 adds a second app (`apps/plans`). Today two seams in the shared packages still know about a specific app: `@aca/core`'s `Database` type hard-codes the `movies` schema, and `@aca/i18n` carries the movies UI strings in its single translation bundle. A second app would either pollute these shared packages or fork them. This change generalizes both seams so an app composes its own schema types and registers its own translation namespace — making "add an app" a drop-in again, with no shared-package edits. It is the explicit prerequisite for the plans app.

## What Changes

- `@aca/core`: export a `BaseDatabase` (carrying only `public` + `shared`); make `createSupabaseClient<DB>` and `AppSupabaseClient<DB>` generic over the database shape (defaulting to `BaseDatabase`); remove the hard-coded `movies` block from core's `Database` type.
- `apps/movies`: define a `MoviesDatabase` (= `BaseDatabase` + the `movies` schema) and type its Supabase client with it.
- `@aca/i18n`: split translations into namespaces — a shared `common` namespace in the package, plus a per-app `movies` namespace the app registers; add a generic `useAppLocale(namespace)` (with a movies-side `useMoviesLocale()` binding) so the ~50 movies `t()` call sites change by import, not by rewriting every key.
- Split the `en`/`es` locale files accordingly; update the i18n parity + `useLocale` tests and the movies component string assertions.

## Capabilities

### New Capabilities

- `app-schema-typing`: apps compose their own typed Supabase `Database` from a shared `BaseDatabase`; `@aca/core` no longer hard-codes any app's schema.
- `app-i18n-namespaces`: shared `common` strings live in `@aca/i18n`; each app registers its own translation namespace (en/es).

### Modified Capabilities

- `data-and-auth` (core) and `i18n` (foundation): their public APIs gain generics / namespace registration, but no existing call site breaks — defaults preserve current behavior.

## Impact

- **Packages**: `@aca/core` (type + client generics) and `@aca/i18n` (namespaces + accessor). Both backward-compatible via defaults.
- **App**: `apps/movies` composes `MoviesDatabase` + registers its `movies` namespace; call sites switch to `useMoviesLocale()` (mechanical import swap).
- **Secrets / schema / backend**: none.
- **Test coverage**: core (the generic client stays typed; defaults compile), i18n (per-namespace parity + `useLocale`/`useAppLocale`), movies (string assertions unchanged in meaning).
- **Rollback**: revert the generics + namespace split; the app re-inlines its schema/strings.
- **Sequencing**: land before `apps-plans` (Phase 7). The two parts (schema typing, i18n namespaces) are independent and can apply/merge separately.
- **Out of scope**: see `design.md` §Non-Goals.
