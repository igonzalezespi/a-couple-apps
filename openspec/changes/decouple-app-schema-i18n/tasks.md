## 1. Core: BaseDatabase + generic client

- [ ] 1.1 `packages/core/src/types.ts`: define `BaseDatabase` (`public` + `shared`); remove the hard-coded `movies` block
- [ ] 1.2 `packages/core/src/client.ts`: make `createSupabaseClient<DB extends BaseDatabase = BaseDatabase>` + `AppSupabaseClient<DB extends BaseDatabase = BaseDatabase>` generic; re-export `BaseDatabase`
- [ ] 1.3 Core tests: the generic client stays typed; defaults compile; the mock-based tests are unchanged

## 2. Movies: compose its own schema

- [ ] 2.1 `apps/movies/src/lib/database.ts` (new): `MoviesDatabase = BaseDatabase & { movies: { ... watchlist_items ... } }`
- [ ] 2.2 Type the movies Supabase client with `MoviesDatabase`; confirm `client.schema('movies')` stays typed; no behavior change

## 3. i18n: namespaces + accessor

- [ ] 3.1 `@aca/i18n`: register a `common` namespace; expose app-namespace registration + a generic `useAppLocale(namespace)`
- [ ] 3.2 Split the shared `common` strings from app strings; keep en/es parity per namespace
- [ ] 3.3 Update the i18n tests: per-namespace parity (common); `useLocale` / `useAppLocale` resolve from the right namespace

## 4. Movies i18n call sites

- [ ] 4.1 Move the movies UI strings into a `movies` namespace owned by `apps/movies`; register it at startup
- [ ] 4.2 Swap the ~50 movies `t()` sites to `useMoviesLocale()` (binding `useAppLocale('movies')`)
- [ ] 4.3 Update the movies component string assertions (meaning unchanged)

## 5. Docs

- [ ] 5.1 ARCHITECTURE + the `@aca/core` / `@aca/i18n` notes: document the BaseDatabase + namespace pattern as the "add an app" recipe
- [ ] 5.2 CHANGELOG; ROADMAP Phase 7 prerequisite note

## Out of Scope

- **Plans app wiring** — this change only generalizes the seams; `apps/plans` consuming them is Phase 7. See design.md §Non-Goals.
- **Language resolution changes** — `resolveExternalLang` / `resolveLanguage` and the en/es set are unchanged. See design.md §Non-Goals.
- **Lazy or runtime namespace loading** — namespaces are statically registered at startup. See design.md §Non-Goals.
- **Supabase type generation** — the `Database` type stays hand-maintained; no `supabase gen types` automation. See design.md §Non-Goals.
