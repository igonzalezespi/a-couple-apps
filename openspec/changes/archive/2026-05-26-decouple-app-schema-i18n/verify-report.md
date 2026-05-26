# Verify Report: decouple-app-schema-i18n

**Change**: `decouple-app-schema-i18n`
**Verified**: `2026-05-26T22:31:00Z`
**Status**: `READY`
**Schema**: `spec-driven`
**Iterations**: `1`
**Dry Run**: `false`

## Scorecard

| Dimension    | Metric                      | Value            | Threshold |
| ------------ | --------------------------- | ---------------- | --------- |
| Completeness | Tasks complete              | `15/15`          | —         |
| Completeness | Requirements covered        | `2/2`            | `≥ 0.80`  |
| Correctness  | Scenarios covered by tests  | `9/9`            | `≥ 0.70`  |
| Correctness  | Requirements mapped to code | `2/2`            | —         |
| Coherence    | Design decisions followed   | `3/3`            | —         |
| Coherence    | Pattern consistency         | `aligned`        | —         |

<!--
  Scenario coverage 9/9 = 1.0: the 5 app-i18n-namespaces scenarios are covered by
  runtime tests; the 4 app-schema-typing scenarios are compile-enforced and counted
  "covered (typecheck)" (the design's negative-control probe + a green `pnpm typecheck`
  prove the typing, not a runtime assertion). Both exceed the 0.70 threshold.
-->

## Findings

### CRITICAL

_None_

### WARNING

_None_

### SUGGESTION

_None_

## Fixes Applied During Verify

_None_

## Deferred Work

_None_

## Manual Actions Required

_None_

## Spec Drift Resolutions

_None_

## Test Compliance

**Summary**: 9 scenarios extracted (4 `app-schema-typing` + 5 `app-i18n-namespaces`), 7 dedicated test cases discovered across 3 test files (4 i18n + 2 movies parity + 1 common parity), 5 high-confidence matches, 0 medium, 0 low, 0 orphan tests, 0 gaps. The 4 `app-schema-typing` scenarios are compile-enforced (no runtime test); they are marked "covered (typecheck)" -- a green `pnpm typecheck` over all 5 packages plus the design's `@ts-expect-error` negative-control probe prove `client.schema('movies')` stays typed and does not regress to the base default.

**Per-scenario table**:

| Requirement | Scenario | Coverage | Matching Test | Confidence | Notes |
|-------------|----------|----------|---------------|------------|-------|
| Apps compose their own typed Database | Core carries no app schema | covered (typecheck) | `packages/core/src/types.ts:12-27` | high | `BaseDatabase` has only `public` + `shared`; no `movies` block. Compile-enforced. |
| Apps compose their own typed Database | An app extends the base | covered (typecheck) | `apps/movies/src/lib/database.ts:12-60` | high | `MoviesDatabase = BaseDatabase & { movies: {...} }`; `@aca/core` unedited. |
| Apps compose their own typed Database | Default keeps existing call sites working | covered (typecheck) | `packages/core/src/client.ts:12,34`, `packages/core/src/provider.tsx:34` | high | Generics default `DB = BaseDatabase` on `AppSupabaseClient`/`createSupabaseClient`/`useSupabase`. |
| Apps compose their own typed Database | Consumption boundary keeps the app's schema typed | covered (typecheck) | `apps/movies/src/lib/useMoviesSupabase.ts:11`, `apps/movies/src/hooks/useWatchlist.ts:25,29` | high | `useSupabase<MoviesDatabase>()` via `useMoviesSupabase`; 5 `client.schema('movies')` calls typecheck; app imports only `@aca/core`. |
| Shared common strings, per-app namespaces | App registers its namespace | covered | `packages/i18n/src/useLocale.test.tsx:77` | high | `registerAppNamespace` + namespace-bound accessor resolves own key ("Hello"). |
| Shared common strings, per-app namespaces | Common strings remain shared | covered | `packages/i18n/src/locales/parity.test.ts:7`, `:11` | high | `common` en/es key parity + non-empty values; `Record<CommonTranslationKey>` compile-guard. |
| Shared common strings, per-app namespaces | Language switching spans namespaces | covered | `packages/i18n/src/useLocale.test.tsx:98` | high | After switch, both app-ns ("Hola") and common-fallback ("Cambiar de persona") reflect es. |
| Shared common strings, per-app namespaces | App namespace falls back to common | covered | `packages/i18n/src/useLocale.test.tsx:87` | high | `switchPerson` (common-only) resolves from the namespace-bound accessor via `fallbackNS`. |
| Shared common strings, per-app namespaces | Accessor exposes language controls | covered | `packages/i18n/src/useLocale.test.tsx:98` | high | `useAppLocale(ns)` returns `{ t, language, languages, setLanguage }`; `language`/`setLanguage` namespace-independent. |

**Orphan tests**: none. The movies-side parity test (`apps/movies/src/i18n/parity.test.ts:7,11`) reinforces the "Common strings remain shared" + per-namespace key-guard contract for the `movies` namespace (en/es parity, non-empty values); it is a per-namespace instance of the parity scenario, not an orphan.

**Gaps**: none. The 4 `app-schema-typing` scenarios carry no runtime test by design (the typing is the contract); they are compile-enforced and verified by `pnpm typecheck` (exit 0, 5/5 packages) plus the review's negative-control probe (`@ts-expect-error client.schema('nope')` errors, proving the `as unknown as AppSupabaseClient<DB>` cast preserves typing rather than degrading to `any`). Per the verify policy these are "covered (typecheck)", not gaps.

## Final Assessment

All checks passed. 15/15 tasks complete; both ADDED requirements (`Apps compose their own typed Database`, `Shared common strings, per-app namespaces`) are implemented and mapped to code; 9/9 scenarios covered (5 by runtime tests, 4 compile-enforced). Design decisions D1 (BaseDatabase + generic chain through `useSupabase<DB>()` with the `as unknown as AppSupabaseClient<DB>` hook-return cast), D2 (`common` default ns + `fallbackNS:'common'` + `useAppLocale`/`useMoviesLocale`, the exact 15-common/22-movies key allocation), and D3 (two independent slices -- commits `cfe528f` core, `2e49673` i18n) are all followed. The Hard Rule holds: `apps/movies` imports no `@supabase/supabase-js` (composes the type from `@aca/core`'s `BaseDatabase`; the `@aca/eslint-config` rule "apps may not import @supabase/supabase-js directly" passes). Gate green and not regressed: `pnpm typecheck` exit 0 (5/5 packages), `pnpm test` exit 0 (all packages; `@aca/i18n` 13 tests incl. `useLocale.test.tsx` 4 + `locales/parity.test.ts` 2, `movies` 56 tests incl. `i18n/parity.test.ts` 2), `pnpm lint` exit 0 (ESLint: No issues found). 0 CRITICAL, 0 WARNING, 0 SUGGESTION. READY for archive.
