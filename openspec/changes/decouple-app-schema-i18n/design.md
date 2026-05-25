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

### D1: `BaseDatabase` + generic client

`@aca/core` exports `BaseDatabase` (`public` + `shared`, both currently table-free). `createSupabaseClient<DB extends BaseDatabase = BaseDatabase>(...)` and `AppSupabaseClient<DB extends BaseDatabase = BaseDatabase>` are generic; the movies app passes `MoviesDatabase`.
**Why**: apps get full `client.schema('movies')` typing without core importing app types; the default keeps untyped call sites working.
**Alternative considered**: keep one growing `Database` in core with every app's schema. Rejected — that is exactly the coupling being removed.

### D2: Per-app i18n namespaces with a thin wrapper

`@aca/i18n` registers a `common` namespace and exposes app-namespace registration (an `addResourceBundle`-style call) plus a generic `useAppLocale(namespace)`. The movies app registers a `movies` namespace and binds `useMoviesLocale()` to it, so the ~50 movies call sites change by import, not by rewriting every key.
**Why**: namespaces are the idiomatic i18next multi-surface split; the wrapper bounds churn.
**Alternative considered**: prefix keys (`movies.*`) in one shared bundle. Rejected — still one bundle the app must edit; namespaces give real ownership.

### D3: Ship the two parts independently

Schema typing (core) and i18n namespaces are mechanically unrelated; sequence them as separate slices/commits so either can land alone.

## Risks / Trade-offs

- **Generic-default ergonomics** -> default `DB = BaseDatabase` so untyped uses compile unchanged; only the app opts into its schema.
- **i18n call-site churn (~50)** -> the `useMoviesLocale()` wrapper makes it a mechanical import swap, not a per-key edit.
- **Parity tests** -> update the parity test to assert per-namespace key parity (common + movies) across en/es.

## Migration Plan (implementation slices)

1. **Core generics** — add `BaseDatabase`, genericize the client/types, delete the `movies` block; the mock-based core tests stay green.
2. **Movies schema compose** — `MoviesDatabase` in the app; type its client; no behavior change.
3. **i18n namespaces** — split `common` vs `movies`; registration + `useAppLocale`; update the parity + `useLocale` tests.
4. **Movies call-site swap** — switch the ~50 sites to `useMoviesLocale()`; update the component string assertions.

Each slice is its own commit, verified before the next.

## Open Questions

- **Q1**: Where do the `movies` namespace strings live — in `apps/movies` or in `@aca/i18n` under a `movies` namespace? Proposal: in `apps/movies` (true ownership); `@aca/i18n` owns only `common` + the machinery.
- **Q2**: Name the accessor `useMoviesLocale` or a generic `useAppLocale(ns)`? Proposal: a generic `useAppLocale(namespace)` in `@aca/i18n`, with `useMoviesLocale` as the movies-side binding.
