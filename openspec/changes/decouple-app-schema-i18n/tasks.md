## 1. Core: BaseDatabase + generic client

- [x] 1.1 `packages/core/src/types.ts`: define `BaseDatabase` (`public` + `shared`); remove the hard-coded `movies` block. `packages/core/src/index.ts`: export `BaseDatabase`; keep `Database` as a deprecated alias (`export type Database = BaseDatabase`) for back-compat
- [x] 1.2 `packages/core/src/client.ts`: make `createSupabaseClient<DB extends BaseDatabase = BaseDatabase>` + `AppSupabaseClient<DB extends BaseDatabase = BaseDatabase>` generic; re-export `BaseDatabase`. `packages/core/src/provider.tsx`: make `useSupabase<DB extends BaseDatabase = BaseDatabase>(): AppSupabaseClient<DB>` generic (cast at the hook return; `SupabaseContext` + `CoreProviderProps.client` stay at the base default `AppSupabaseClient`)
- [x] 1.3 Core tests: the generic client + `useSupabase<DB>()` stay typed; defaults compile; the mock-based tests are unchanged

## 2. Movies: compose its own schema

- [x] 2.1 `apps/movies/src/lib/database.ts` (new): `MoviesDatabase = BaseDatabase & { movies: { ... watchlist_items ... } }`
- [x] 2.2 Type the movies Supabase client with `MoviesDatabase`; call `useSupabase<MoviesDatabase>()` at the watchlist hooks (`apps/movies/src/hooks/useWatchlist.ts`), e.g. via a one-line app-local `useMoviesSupabase = () => useSupabase<MoviesDatabase>()`, so `client.schema('movies')` stays typed; no behavior change
- [x] 2.3 Verify `pnpm typecheck` is green for both `packages/core` and `apps/movies` after the schema slice (guards the consumption-boundary regression)

## 3. i18n: namespaces + accessor

- [x] 3.1 `@aca/i18n`: register a `common` namespace as the default ns; expose app-namespace registration (with i18next `fallbackNS: 'common'` for app namespaces) + a generic `useAppLocale(namespace)` returning `{ t, language, languages, setLanguage }` (`t` bound to `namespace`; `language`/`languages`/`setLanguage` read/drive the i18n instance, namespace-independent)
- [x] 3.2 Split the shared `common` strings from app strings per the D2 allocation; split the key guard -- define `CommonTranslationKey` in `@aca/i18n` and type the `common` `es` bundle `Record<CommonTranslationKey, string>`; keep en/es parity per namespace
- [x] 3.3 Update the i18n tests: extend `packages/i18n/src/locales/parity.test.ts` for the `common` namespace; `useLocale` / `useAppLocale` resolve from the right namespace (incl. a movies-key-with-common-fallback case and that `useAppLocale` exposes `language`/`setLanguage`)

## 4. Movies i18n call sites

- [x] 4.1 Move the movies UI strings into a `movies` namespace owned by `apps/movies`; register it at startup with `fallbackNS: 'common'`. Define `MoviesTranslationKey` and type the movies `es` bundle `Record<MoviesTranslationKey, string>`
- [x] 4.2 Swap the 44 movies `t()` sites across 5 files (`HomeScreen.tsx`, `SearchScreen.tsx`, `Watchlist.tsx`, `CurrentPersonBadge.tsx`, `PersonGate.tsx`) to `useMoviesLocale()` (binding `useAppLocale('movies')`); common keys resolve via `fallbackNS`. Keep `language`/`setLanguage` working in `HomeScreen`/`SearchScreen` (now from `useMoviesLocale()`)
- [x] 4.3 Add a movies-side parity test (en/es) for the `movies` namespace; update the movies component string assertions (meaning unchanged)

## 5. Docs

- [ ] 5.1 ARCHITECTURE + the `@aca/core` / `@aca/i18n` notes: document the BaseDatabase + namespace pattern as the "add an app" recipe
- [ ] 5.2 CHANGELOG; ROADMAP Phase 7 prerequisite note

## Out of Scope

- **Plans app wiring** — this change only generalizes the seams; `apps/plans` consuming them is Phase 7. See design.md §Non-Goals.
- **Language resolution changes** — `resolveExternalLang` / `resolveLanguage` and the en/es set are unchanged. See design.md §Non-Goals.
- **Lazy or runtime namespace loading** — namespaces are statically registered at startup. See design.md §Non-Goals.
- **Supabase type generation** — the `Database` type stays hand-maintained; no `supabase gen types` automation. See design.md §Non-Goals.
