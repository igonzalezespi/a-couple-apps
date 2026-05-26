# Review Report: decouple-app-schema-i18n

**Change**: `decouple-app-schema-i18n`
**Reviewed**: `2026-05-26T22:03:58Z`
**Readiness**: `READY`
**Schema**: `spec-driven`
**Waived**: `false`

<!--
  Re-review (iteration 2). The first review (2026-05-26T21:49:43Z) found
  1 CRITICAL + 4 WARNING + 3 SUGGESTION and the change was BLOCKED. The
  artifacts were then modified to address them. This iteration confirms every
  prior finding is RESOLVED, that no new CRITICAL was introduced, and re-runs
  the empirical feasibility probes. All prior findings are retained below with
  a **Resolution** note. New (re-review) findings carry fresh IDs.
-->

## Scorecard

| Artifact | Completeness | Quality | Notes |
| -------- | ------------ | ------- | ----- |
| proposal | high         | high    | What Changes now states the genericized consumption boundary, fallbackNS-justified mechanical swap, and the corrected 44/5 figure. |
| design   | high         | high    | D1 genericizes the full chain (`useSupabase<DB>()` + hook-return cast); D2 adds the resolution strategy, explicit key allocation, accessor shape, and per-namespace guard; Open Questions promoted to Resolved. |
| specs    | high         | high    | Both delta specs gain the matching scenarios (consumption-boundary typing; namespace fallback; accessor language controls); coherent with canonical data-and-auth / i18n. |
| tasks    | high         | high    | Covers `useSupabase<DB>()` re-typing, the typecheck guard task (2.3), fallbackNS + accessor (3.1), per-namespace key types (3.2/4.1), barrel + alias (1.1), and the movies parity test (4.3). |

## Artifact Findings

### CRITICAL

- **[a1c4f8e2]** (RESOLVED) Provider/context chain is not genericized -- `client.schema('movies')` stops compiling -- `design:D1 / tasks:1.1-1.2,2.2`
  - **Artifact**: design
  - **Kind**: conflicting_decision
  - **Detail**: The original artifacts genericized only `createSupabaseClient<DB>` + `AppSupabaseClient<DB>` and deleted the `movies` block from the base `Database`, while leaving `SupabaseContext` / `CoreProviderProps.client` / `useSupabase()` non-generic. Because the movies hooks call `client.schema('movies')` where `client = useSupabase()` (`apps/movies/src/hooks/useWatchlist.ts` -- 5 schema calls at lines 30,50,65,78,101; `SCHEMA = 'movies'` is a `const`), and supabase-js constrains `.schema(name)` to `name extends keyof DB`, removing `movies` from the base would make every call fail `TS2345`. This blocked `pnpm typecheck` for `apps/movies`.
  - **Recommendation**: Thread the DB type through the consumption boundary: `useSupabase<DB extends BaseDatabase = BaseDatabase>(): AppSupabaseClient<DB>` (cast at the hook return, since React context erases the generic), movies calling `useSupabase<MoviesDatabase>()` (via a one-line `useMoviesSupabase`). App still imports only `@aca/core` (Hard Rule preserved).
  - **Auto-fix eligible**: no (design + tasks decision)
  - **Resolution**: ADDRESSED. design D1 now genericizes the **full chain** -- `useSupabase<DB extends BaseDatabase = BaseDatabase>(): AppSupabaseClient<DB>` with an explicit hook-return cast, `SupabaseContext`/`CoreProviderProps.client` staying at the base default, and the app calling `useSupabase<MoviesDatabase>()` via `useMoviesSupabase`. tasks 1.2 re-types `provider.tsx` accordingly, 2.1 defines `MoviesDatabase`, 2.2 swaps the watchlist hooks, and the new task 2.3 makes `pnpm typecheck` green for both `packages/core` and `apps/movies` a checklist item (guards the regression). proposal What Changes + Impact and the app-schema-typing spec gain the matching "Consumption boundary keeps the app's schema typed" scenario (asserts the hook returns a client typed at `AppDatabase`, the schema call typechecks, and the app never imports `@supabase/supabase-js`). **Empirically re-verified**: the current tree typechecks green (exit 0, all 5 packages); a probe reproducing the planned post-change chain (base-defaulted generic client, generic `useSupabase<DB>()` with an `as unknown as AppSupabaseClient<DB>` return cast, `useMoviesSupabase`, the 4 real `client.schema('movies')` shapes) typechecks green against the movies tsconfig, and a `@ts-expect-error client.schema('nope')` negative control still errors -- proving the cast preserves typing rather than degrading to `any`. The Hard Rule is preserved (the probe imports only the supabase-js TYPE for the simulation; the real app composes the type via `@aca/core`'s `BaseDatabase` and calls core's hook/factory). The blocker is cleared.

### WARNING

- **[b2d7a049]** (RESOLVED) i18n call-site change is NOT a mechanical import swap -- mixed common+app keys per scope -- `proposal:What Changes / design:D2 / tasks:4.2`
  - **Artifact**: proposal
  - **Kind**: vague_requirement
  - **Detail**: The "mechanical import swap" framing was false as written: movies components mix shared and app strings in the same scope (e.g. `HomeScreen.tsx` uses `t('appName')`/`t('language')` alongside `t('search')`/`t('watchlist')`), so a blanket swap to a `movies`-namespace hook would break every common-key lookup unless namespace resolution is specified.
  - **Recommendation**: State the concrete strategy -- `fallbackNS:'common'` on the movies namespace (so app components reach common keys unprefixed) or dual hooks per component.
  - **Auto-fix eligible**: no (design decision)
  - **Resolution**: ADDRESSED. design D2 adds a dedicated "Resolution strategy (why the swap is mechanical)" paragraph: register the `movies` namespace with i18next **`fallbackNS: 'common'`** and keep `common` as the default ns, so `useMoviesLocale()` resolves movies keys first and falls back to `common` for shared keys -- a one-line import change per component. The dual-hook alternative is recorded as rejected. proposal What Changes + Impact now attribute the mechanicalness to `fallbackNS`, and the app-i18n-namespaces spec gains the "App namespace falls back to common" scenario. `fallbackNS` confirmed a real i18next v25 option (`fallbackNS?: false | string | readonly string[]` in the installed typings).

- **[c3e1b65a]** (RESOLVED) common-vs-movies key allocation is undefined -- `design:Open Questions Q1 / tasks:3.2,4.1`
  - **Artifact**: design
  - **Kind**: undefined_term
  - **Detail**: The `common` vs `movies` split was never enumerated, yet several keys (`loading`, `search`, generic actions, and the person-gate strings `whoAreYou`/`switchPerson`/`youArePerson`) are ambiguous; an unallocated key would dangle or duplicate.
  - **Recommendation**: Add an explicit key allocation table; person-gate + generic-action keys stay `common`.
  - **Auto-fix eligible**: no (product/architecture judgment)
  - **Resolution**: ADDRESSED. design D2 adds an explicit "Key allocation (which strings live where)" table plus an "Allocation rule" (person-gate + generic-action + language + app/nav-label keys stay `common`; domain strings move to the owning app). **Re-verified against the source**: the table is an exact, exhaustive partition of the current `en` bundle -- 15 `common` + 22 `movies` = 37 keys = every `en` key, with zero unallocated keys and zero overlap. The keys actually used by the app-agnostic person-gate components (`PersonGate.tsx`: `appName`, `loading`, `whoAreYou`; `CurrentPersonBadge.tsx`: `youArePerson`) are all in `common`, so swapping those components to `useMoviesLocale()` with `fallbackNS:'common'` resolves them -- no misplaced string. The app-i18n-namespaces spec encodes the rule ("shell / person-gate / generic-action / language / app-label strings in `common`").

- **[d4f0c712]** (RESOLVED) `useMoviesLocale()` must still surface `language` / `setLanguage` -- `design:D2,Q2 / tasks:4.2`
  - **Artifact**: design
  - **Kind**: missing_scenario
  - **Detail**: `HomeScreen.tsx` reads `language` + `setLanguage` and `SearchScreen.tsx` reads `language` (feeding `searchMovies` -> `resolveExternalLang`) from the same hook they use for `t`; a `t`-only wrapper would force a second `useLocale()` call and break the single-import swap.
  - **Recommendation**: Specify `useAppLocale(ns)` returns the full `useLocale` shape (`t` bound to `ns`, plus `language`, `languages`, `setLanguage`).
  - **Auto-fix eligible**: no (API-shape decision)
  - **Resolution**: ADDRESSED. design D2 "Accessor shape" specifies `useAppLocale(namespace)` returns the **full `useLocale` shape** -- `{ t, language, languages, setLanguage }` -- `t` bound to the namespace, `language`/`languages`/`setLanguage` namespace-independent. proposal What Changes and tasks 3.1 state the same shape; the app-i18n-namespaces spec gains the "Accessor exposes language controls" scenario asserting `{ t, language, languages, setLanguage }` and that `language`/`setLanguage` are identical to `useLocale`'s. **Re-verified**: the existing `useLocale()` already returns exactly `{ t, language, languages, setLanguage }`, so the wrapper can mirror it; `HomeScreen.tsx` (`language`, `setLanguage`) and `SearchScreen.tsx` (`language` feeding `searchMovies`) are confirmed call sites.

- **[e5a9d381]** (RESOLVED) `TranslationKey` type + `es.ts` typing split is unaddressed -- `tasks:3.2`
  - **Artifact**: tasks
  - **Kind**: ambiguous_task
  - **Detail**: `@aca/i18n` exports `TranslationKey = keyof typeof en` and `es.ts` is typed `Record<TranslationKey, string>` (the compile-time missing-key guard). Splitting `en` into `common` + `movies` breaks this contract; the original task 3.2 never mentioned the type or that `es.ts` must split, so the guard could silently regress to runtime-only.
  - **Recommendation**: Define per-namespace key types (`CommonTranslationKey` in `@aca/i18n`, `MoviesTranslationKey` in `apps/movies`), type each `es` bundle accordingly, and add a movies-side parity test.
  - **Auto-fix eligible**: no (tasks must enumerate the contract)
  - **Resolution**: ADDRESSED. tasks 3.2 now defines `CommonTranslationKey` in `@aca/i18n` and types the common `es` bundle `Record<CommonTranslationKey, string>`; tasks 4.1 defines `MoviesTranslationKey` in `apps/movies` and types the movies `es` bundle likewise; tasks 3.3/4.3 keep per-namespace en/es parity tests (extend the existing `parity.test.ts` for `common`, add a movies-side parity test). design D2 "Compile-time key guard" and Risks document the split. **Re-verified**: the current guard (`TranslationKey = keyof typeof en` at `en.ts:42`; `es: Record<TranslationKey, string>` at `es.ts:4`; `parity.test.ts` asserting equal key sets) is exactly the contract the split must preserve.

### SUGGESTION

- **[f6b2e094]** (RESOLVED) Barrel re-export of `BaseDatabase` (and disposition of `Database`) is unstated -- `tasks:1.2 / packages/core/src/index.ts`
  - **Artifact**: tasks
  - **Kind**: ambiguous_task
  - **Detail**: The package's public entry is `packages/core/src/index.ts` (currently `export { type Database }`); for the app to write `MoviesDatabase = BaseDatabase & {...}`, `BaseDatabase` must be exported from the barrel, and the disposition of the existing `Database` export was unstated.
  - **Recommendation**: Export `BaseDatabase` from `index.ts`; decide whether `Database` stays as an alias or is dropped.
  - **Auto-fix eligible**: no (trivial but should be enumerated)
  - **Resolution**: ADDRESSED. tasks 1.1 exports `BaseDatabase` from `packages/core/src/index.ts` and keeps `Database` as a deprecated alias (`export type Database = BaseDatabase`); design D1 "Barrel + back-compat" and proposal What Changes/Impact state the same. The app-schema-typing spec requires `BaseDatabase` exported from the barrel and the `Database` alias retained.

- **[a7c3f520]** (RESOLVED) Call-site count is overstated (~50 vs actual 44 across 5 files) -- `proposal:What Changes / design:D2 / tasks:4.2`
  - **Artifact**: proposal
  - **Kind**: vague_requirement
  - **Detail**: The original "~50 movies `t()` call sites" estimate set scope expectations; the actual count is 44 across 5 non-test files.
  - **Recommendation**: Note the real figure (44 calls / 5 files).
  - **Auto-fix eligible**: yes (estimate text only)
  - **Resolution**: ADDRESSED. proposal, design, and tasks all cite "44 movies `t()` call sites" / "44 calls / 5 files" and enumerate the 5 files (`HomeScreen.tsx`, `SearchScreen.tsx`, `Watchlist.tsx`, `CurrentPersonBadge.tsx`, `PersonGate.tsx`). **Re-verified**: `t(` occurrences are 7 + 14 + 19 + 1 + 3 = 44 across exactly those 5 files; 5 `useLocale()` import sites.

- **[b8d4a631]** (RESOLVED) Design Open Questions Q1/Q2 are still open though the proposal already commits to answers -- `design:Open Questions`
  - **Artifact**: design
  - **Kind**: conflicting_decision
  - **Detail**: design Open Questions Q1 (where movies strings live) and Q2 (accessor name) were left as "Proposal: ..." while What Changes + D2 already committed to those answers, inviting re-litigation during apply.
  - **Recommendation**: Promote Q1/Q2 resolutions into the Decisions.
  - **Auto-fix eligible**: yes (move resolved answers into Decisions)
  - **Resolution**: ADDRESSED. The section is renamed "Resolved (formerly Open Questions)" with Q1 (movies strings live in `apps/movies`) and Q2 (generic `useAppLocale(namespace)` + `useMoviesLocale` binding) marked `(resolved)` and noted as committed in What Changes + D2. No dangling "Proposal:" placeholders remain.

- **[c9e2b7a4]** (NEW, minor) Hook-return cast needs an `unknown` bridge (`as unknown as AppSupabaseClient<DB>`) -- `design:D1 / tasks:1.2`
  - **Artifact**: design
  - **Kind**: ambiguous_task
  - **Detail**: D1 / tasks 1.2 say "the hook casts its return to `AppSupabaseClient<DB>`" without specifying the cast form. A direct `client as AppSupabaseClient<DB>` is rejected by tsc with `TS2352` ("neither type sufficiently overlaps", because the schema-name union of `AppSupabaseClient<BaseDatabase>` and `AppSupabaseClient<DB>` differ structurally); the compiler explicitly suggests converting via `unknown`. The empirically-green pattern is `return client as unknown as AppSupabaseClient<DB>`.
  - **Recommendation**: Note in D1 / tasks 1.2 that the cast is `as unknown as AppSupabaseClient<DB>`. Not blocking -- apply hits `TS2352` immediately and the one-token fix is obvious; "cast at the hook return" remains accurate.
  - **Auto-fix eligible**: yes (one-token clarification in the cast wording)

## Fixes Applied During Review

_None_

## Deferred Artifact Work

_None_

## Readiness

READY. All prior findings are resolved. The CRITICAL blocker [a1c4f8e2] is cleared: design D1 + tasks 1.2/2.2 + the new typecheck guard task 2.3 + the app-schema-typing "Consumption boundary keeps the app's schema typed" scenario genericize the full consumption chain (`useSupabase<DB>()` with a hook-return cast, movies passing `MoviesDatabase`), which an empirical probe confirms compiles green and keeps `client.schema('movies')` typed (with a passing negative control) while preserving the Hard Rule (the app composes a type from `@aca/core`'s `BaseDatabase` and calls core's hook/factory, never `@supabase/supabase-js`). The realtime path (`subscribeCoupleChannel`, whose `schema` param is a plain `string`) is unaffected by removing `movies` from the base, so no sixth typing site regresses. The four WARNINGs are resolved by design D2's resolution strategy (`fallbackNS:'common'`), the exhaustive 15/22 common/movies key allocation (verified to partition the `en` bundle exactly, person-gate keys in `common`), the full `{ t, language, languages, setLanguage }` accessor shape, and the per-namespace key guard; the three SUGGESTIONs (barrel + alias, 44/5 count, Q1/Q2 promotion) are all incorporated. One NEW minor SUGGESTION [c9e2b7a4] notes the hook cast must bridge through `unknown` (`as unknown as AppSupabaseClient<DB>`) to satisfy tsc; it is non-blocking. No new CRITICAL was introduced. /opsx:apply may proceed.

## Next Step

Run /opsx:apply decouple-app-schema-i18n to start implementation. During the core slice, write the `useSupabase<DB>()` return cast as `as unknown as AppSupabaseClient<DB>` (per [c9e2b7a4]) and confirm `pnpm typecheck` is green for `packages/core` and `apps/movies` (task 2.3) before the i18n slices.
