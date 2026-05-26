## Context

The foundation centralized the data boundary (`@aca/core`) and i18n (`@aca/i18n`). Both currently embed movies-specific detail: `packages/core/src/types.ts` hard-codes a `movies` schema block in `Database`, and `packages/i18n` ships all UI strings (including the movies app's) in one bundle. With one app this is harmless; with two it forces shared-package edits per app. (The `shared` schema's `profiles` table and the auth model were already removed; `Database` now carries `public` + an empty `shared` + the stray `movies` block — this change removes that last app-specific block.)

## Goals / Non-Goals

**Goals:**

- `@aca/core` knows only `public` + `shared`; apps extend it with their own schemas, fully typed.
- `@aca/i18n` owns only shared / `common` strings; apps own their own namespaces.
- Backward compatible: existing movies call sites change mechanically; nothing in core/i18n breaks by default.
- Unblock the plans app to add its schema + strings without touching the shared packages.

**Non-Goals:**

- **Plans app wiring** — this change only generalizes the seams; `apps/plans` actually consuming them is Phase 7.
- **Language resolution changes** — `resolveExternalLang` / `resolveLanguage` and the en/es set are unchanged.
- **Lazy or runtime namespace loading** — namespaces are statically registered at startup, not fetched on demand.
- **Supabase type generation** — the `Database` type stays hand-maintained; no `supabase gen types` automation here.

## Decisions

### D1: `BaseDatabase` + generic client, genericized through the consumption boundary

`@aca/core` exports `BaseDatabase` (`public` + `shared`, both currently table-free) and genericizes the **full chain** the app touches, not just the factory:

- **Factory + client type**: `createSupabaseClient<DB extends BaseDatabase = BaseDatabase>(...)` and `AppSupabaseClient<DB extends BaseDatabase = BaseDatabase>` are generic; the movies app passes `MoviesDatabase`. `AppSupabaseClient` (no arg) stays `AppSupabaseClient<BaseDatabase>`.
- **Consumption hook**: `useSupabase<DB extends BaseDatabase = BaseDatabase>(): AppSupabaseClient<DB>` is also generic. The React context (`SupabaseContext`) and `CoreProviderProps.client` stay at the base default (`AppSupabaseClient` = `AppSupabaseClient<BaseDatabase>`), because a React context cannot carry a per-consumer generic; the hook therefore casts its return to `AppSupabaseClient<DB>`. The app calls `useSupabase<MoviesDatabase>()` (or a one-line app-local `useMoviesSupabase = () => useSupabase<MoviesDatabase>()`) at the watchlist hooks so `client.schema('movies')` stays typed.
- **Barrel + back-compat**: `BaseDatabase` is exported from `packages/core/src/index.ts` so the app can write `MoviesDatabase = BaseDatabase & {...}`. `Database` is kept as a deprecated alias (`export type Database = BaseDatabase`) so no existing consumer breaks.

**Why**: supabase-js constrains `.schema(name)` to `name extends keyof DB`. Genericizing only the factory/`AppSupabaseClient` is insufficient: `useSupabase()` returns the context-typed client, so once `movies` is removed from the base, `client.schema('movies')` at `apps/movies/src/hooks/useWatchlist.ts` fails with `TS2345` (`'movies'` not assignable to `'public' | 'shared'`). Threading the generic to `useSupabase<DB>()` and passing `MoviesDatabase` at the call site restores the typing. The app still imports only `@aca/core` (Hard Rule preserved -- it composes a TYPE and calls a core hook/factory, never `@supabase/supabase-js`).
**Alternative considered**: keep one growing `Database` in core with every app's schema. Rejected -- that is exactly the coupling being removed. Widening `CoreProvider`/`SupabaseContext` to be generic was also considered; rejected as heavier than the hook-cast (a context value cannot vary its generic per consumer anyway).

### D2: Per-app i18n namespaces with a thin wrapper

`@aca/i18n` registers a `common` namespace (the i18next **default ns**) and exposes app-namespace registration (an `addResourceBundle`-style call) plus a generic `useAppLocale(namespace)`. The movies app registers a `movies` namespace and binds `useMoviesLocale()` to it, so the 44 movies call sites change by import, not by rewriting every key.
**Why**: namespaces are the idiomatic i18next multi-surface split; the wrapper bounds churn.
**Alternative considered**: prefix keys (`movies.*`) in one shared bundle. Rejected — still one bundle the app must edit; namespaces give real ownership.

**Resolution strategy (why the swap is mechanical):** the movies components mix `common` and `movies` keys in the same scope (e.g. `HomeScreen.tsx` uses `t('appName')`, `t('language')`, `t('switchPerson')` alongside `t('search')`, `t('watchlist')`; `SearchScreen.tsx` mixes `t('back')`/`t('loading')` with `t('searchPlaceholder')`/`t('noResults')`; `Watchlist.tsx` mixes `t('loading')`/`t('remove')` with `t('watchlistEmpty')`/`t('tonightsPick')`). To keep a single-hook swap, register the `movies` namespace with i18next **`fallbackNS: 'common'`** and keep `common` as the default ns. `useMoviesLocale()` binds `t` to the `movies` namespace, which resolves movies keys first and **falls back to `common`** for the shared keys. So swapping a component from `useLocale()` to `useMoviesLocale()` is a one-line import change: movies keys hit the `movies` bundle, common keys fall through to `common`. (Rejected alternative: dual `useLocale()` + `useMoviesLocale()` per component with per-`t()` routing -- that makes the swap a per-call edit, contradicting the proposal's framing.)

**Key allocation (which strings live where):**

- **`common`** (in `@aca/i18n`, used by any app / the shell): person-gate strings (`whoAreYou`, `switchPerson`, `youArePerson`), `loading`, language labels (`language`, `english`, `spanish`), app/nav labels (`appName`, `movies`, `plans`), and generic actions (`add`, `cancel`, `save`, `remove`, `back`).
- **`movies`** (owned by `apps/movies`): movies-domain strings -- search (`search`, `searchPlaceholder`, `searchPrompt`, `noResults`, `searchError`), watchlist (`watchlist`, `watched`, `markWatched`, `watchlistEmpty`, `added`, `alreadyOnWatchlist`, `poster`, `toWatch`, `addedByYou`, `addedByPartner`, `addedByName`, `addFirstMovie`), and tonight-pick (`pickForTonight`, `tonightsPick`, `clearPick`, `pickedByYou`, `pickedByName`).

**Allocation rule:** person-gate + generic-action + language + app/nav-label keys stay `common` (they belong to every app under the no-auth person model and the shell); domain strings move to the owning app's namespace. A key dangles or duplicates if mis-allocated, so this table is the contract the spec references.

**Accessor shape:** `useAppLocale(namespace)` returns the **full `useLocale` shape** -- `{ t, language, languages, setLanguage }` -- with `t` bound to `namespace` (plus `fallbackNS` resolution). `language`/`languages`/`setLanguage` are namespace-independent (they read/drive `i18n.language` on the instance), so they are identical to `useLocale()`'s. This matters because `HomeScreen.tsx` reads `language` + `setLanguage` and `SearchScreen.tsx` reads `language` (feeding `searchMovies` -> `resolveExternalLang`) from the same hook they use for `t`; returning only `t` would force those components to keep a second `useLocale()` call and break the single-import swap.

**Compile-time key guard:** splitting `en` into per-namespace bundles breaks the existing `TranslationKey = keyof typeof en` / `es: Record<TranslationKey, string>` missing-key guard. The guard splits per namespace -- `CommonTranslationKey` in `@aca/i18n`, `MoviesTranslationKey` in `apps/movies` -- with each `es` bundle typed `Record<...Key, string>`, so en/es parity stays compile-enforced per namespace (see tasks 3.2/4.1).

### D3: Ship the two parts independently

Schema typing (core) and i18n namespaces are mechanically unrelated; sequence them as separate slices/commits so either can land alone.

## Risks / Trade-offs

- **Generic-default ergonomics** -> default `DB = BaseDatabase` on the factory, `AppSupabaseClient`, and `useSupabase` so untyped uses compile unchanged; only the app opts into its schema (by passing `MoviesDatabase` to `useSupabase<MoviesDatabase>()`).
- **Consumption-boundary typing** -> removing `movies` from the base while leaving `useSupabase()` non-generic would break `client.schema('movies')` (`TS2345`); genericizing `useSupabase<DB>()` (with a hook-return cast over the generic-erasing context) and passing `MoviesDatabase` at the call site resolves it. Verify `pnpm typecheck` green for `packages/core` and `apps/movies` after the schema slice.
- **i18n call-site churn (44 calls / 5 files)** -> the `useMoviesLocale()` wrapper + `fallbackNS:'common'` makes it a per-file import swap, not a per-key edit; common keys resolve via the fallback.
- **Mis-allocated key dangles** -> the D2 allocation table fixes ownership; the per-namespace key guard (`CommonTranslationKey`/`MoviesTranslationKey`) catches a stray key at compile time.
- **Parity tests** -> assert per-namespace key parity: extend `packages/i18n/src/locales/parity.test.ts` for `common`, add a movies-side parity test for the `movies` namespace, across en/es.

## Migration Plan (implementation slices)

1. **Core generics** -- add `BaseDatabase`, genericize the factory + `AppSupabaseClient` + `useSupabase<DB>()` (hook-return cast), export `BaseDatabase` from the barrel, keep `Database` as a deprecated alias, delete the `movies` block; the mock-based core tests stay green; `pnpm typecheck` green for `packages/core`.
2. **Movies schema compose** -- `MoviesDatabase` in the app; call `useSupabase<MoviesDatabase>()` (via `useMoviesSupabase`) at the watchlist hooks so `client.schema('movies')` stays typed; no behavior change; `pnpm typecheck` green for `apps/movies`.
3. **i18n namespaces** -- split `common` vs `movies` strings and the key guard (`CommonTranslationKey`); register the namespace machinery + `fallbackNS:'common'`; add `useAppLocale(namespace)` returning `{ t, language, languages, setLanguage }`; update the parity + `useLocale`/`useAppLocale` tests.
4. **Movies call-site swap** -- register the `movies` namespace (+ `MoviesTranslationKey`); switch the 44 sites across 5 files to `useMoviesLocale()`; add a movies-side parity test; update the component string assertions.

Each slice is its own commit, verified before the next.

## Resolved (formerly Open Questions)

- **Q1 (resolved)**: The `movies` namespace strings live in `apps/movies` (true ownership); `@aca/i18n` owns only `common` + the machinery. Committed in What Changes + D2.
- **Q2 (resolved)**: The accessor is a generic `useAppLocale(namespace)` in `@aca/i18n`, with `useMoviesLocale` as the movies-side binding. Committed in D2.
