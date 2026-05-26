## 1. Scaffold + foundation integration

- [ ] 1.1 Create `apps/plans` Expo app (`app.config.ts`, `package.json`, `tsconfig.json` extending `@aca/typescript-config/react-native.json`, entry) consuming `@aca/{ui,core,i18n,config}`, mirroring `apps/movies`
- [ ] 1.2 Add `babel.config.js` (Tamagui plugin) + `metro.config.js` (workspace) + `eslint.config.mjs` (the shared `eslint-config-expo` layer), mirroring `apps/movies`
- [ ] 1.3 Expo Router `app/_layout.tsx` mounts the UI + i18n + `CoreProvider` (+ person gate) stack; an index screen renders `@aca/ui` primitives with `@aca/i18n` strings. Acceptance: `pnpm --filter plans typecheck`/`lint`/`test` green; `expo export -p web` builds

## 2. Plans schema (`plans.plans`)

- [ ] 2.1 `supabase/migrations/0005_plans_schema.sql`: `create schema plans`; `plans.plans` (`id`, `title`, `starts_at timestamptz not null`, `ends_at timestamptz null`, `location text null`, `category text null`, `url text null`, `notes text null`, `completed boolean not null default false`, `created_by text null`, `created_at timestamptz not null default now()`); CHECK `ends_at is null or ends_at >= starts_at`
- [ ] 2.2 Anon RLS mirroring movies: enable RLS; SELECT / INSERT / DELETE policies for `anon`; UPDATE policy `using(true) with check(true)`
- [ ] 2.3 Grants: `grant usage on schema plans to anon`; `grant select, insert, delete on plans.plans to anon`; column-scoped `grant update (title, starts_at, ends_at, location, category, url, notes, completed) on plans.plans to anon` so `created_by` cannot be rewritten after insert
- [ ] 2.4 Add `plans.plans` to the `supabase_realtime` publication (guarded for idempotent re-apply); apply the migration to the live project; confirm `plans` is exposed in the API schemas

## 3. Typed client + row contract

- [ ] 3.1 `apps/plans/src/lib/database.ts`: `PlansDatabase = BaseDatabase & { plans: { Tables: { plans: { Row; Insert; Update; Relationships } }; Views; Functions; Enums; CompositeTypes } }`
- [ ] 3.2 `apps/plans/src/lib/usePlansSupabase.ts`: `usePlansSupabase = () => useSupabase<PlansDatabase>()` (the app imports no `@supabase/supabase-js`)
- [ ] 3.3 `apps/plans/src/lib/plans.ts`: a zod contract for the `plans.plans` row + a `NewPlan` input type + an `all_day` derivation helper (D3); unit-test the contract + the all-day helper

## 4. Plans i18n namespace

- [ ] 4.1 `apps/plans/src/i18n/{en.ts,es.ts}`: the `plans`-namespace strings (plan fields, list/empty/error, create/edit/complete/delete actions) with a `PlansTranslationKey` key guard
- [ ] 4.2 `apps/plans/src/i18n/index.ts`: `createPlansI18n` (`createI18n` + `registerAppNamespace(.., 'plans', ..)`) + `usePlansLocale = () => useAppLocale('plans')`, mirroring movies
- [ ] 4.3 en/es parity test for the `plans` namespace

## 5. Plans list (CRUD) + data hooks

- [ ] 5.1 `@aca/core`-based hooks: list plans (ordered upcoming-first, completed after); create; edit; toggle complete; delete -- all validated against the zod contract, writing `created_by` from the current person
- [ ] 5.2 Plans list screen from `@aca/ui`: each plan shows title, date/time (all-day vs timed), location/category when set, completed treatment; row actions complete + delete
- [ ] 5.3 Create / edit plan form from `@aca/ui`: title, date + optional time (all-day vs timed), optional end, location, category, url, notes
- [ ] 5.4 Hook tests (create/edit/complete/delete call the right queries; create writes the person id; ordering requested) + component tests (render plans, toggle complete, delete) with mocked data

## 6. Realtime sync

- [ ] 6.1 Subscribe via `subscribeCoupleChannel` (schema `plans`) on the list screen; invalidate the plans query on change; unsubscribe on unmount
- [ ] 6.2 Test that a simulated realtime change invalidates the plans query

## 7. States + polish

- [ ] 7.1 Loading / empty / error states for the plans list and the form; all strings via `@aca/i18n`, all styling via `@aca/ui`
- [ ] 7.2 Test a localized render + that the empty state appears with no plans

## 8. Plan searcher -- catalog (final capability, part 1)

- [ ] 8.1 `apps/plans/src/sources/types.ts`: the `Category` + `Zone` unions, the `Source` interface (`id, name, url, types, zones, priority, frequency, howToMonitor?, notes?`), and the `Community` entry type (D4)
- [ ] 8.2 Zone-split data modules seeded from `docs/plans-investigation.md`: `murcia.ts`, `alicante.ts`, `national.ts`, a `communities.ts` (forums/subreddits/newsletters), and an `example.ts` neutral/placeholder region so a contributor sees the shape to copy
- [ ] 8.3 `apps/plans/src/sources/index.ts`: assemble the registry from the zone files; a test asserting every entry is well-formed (valid `Category`/`Zone` values, non-empty `url`) and that the example region is present

## 9. Plan searcher -- form + ranking (final capability, part 2)

- [ ] 9.1 Search form from `@aca/ui`: a date, one or more zones, one or more categories, and an optional free-text vibe
- [ ] 9.2 Filter + rank logic: keep sources whose `zones` intersect the chosen zones AND whose `types` intersect the chosen categories; order essential-first; weight by cadence-vs-date (e.g. a weekly agenda outranks an annual festival for a near date, and vice-versa for a far date); surface matching communities; flag entries carrying a caveat (`priority: 'caveat'` or a caveat `notes`, e.g. Wegow)
- [ ] 9.3 Unit-test the ranking: zone n category filtering, essential-first ordering, cadence-vs-date weighting, community surfacing, and caveat flagging

## 10. Plan searcher -- results + AI prompt (final capability, part 3)

- [ ] 10.1 "Where to search" results UI from `@aca/ui`: the ranked sources grouped (e.g. by zone or category), each with a tappable URL (`Linking`/`expo-linking`), its `howToMonitor` guidance, and the surfaced communities; caveats shown inline
- [ ] 10.2 AI-prompt generator: build a paste-ready prompt embedding the context (date, zone(s), categories, vibe), the filtered sources with URLs, the relevant communities, the active caveats, the desired output format, and the configured language; copy-to-clipboard via `expo-clipboard`
- [ ] 10.3 Discovery -> add-to-plans: a result (or a free-form idea) prefills the create form (`title`, `starts_at` = searched date, `url`, `category`) for the user to confirm and save (D7)
- [ ] 10.4 Searcher i18n strings (form labels, results, prompt UI, copy confirmation) in the `plans` namespace (en/es)
- [ ] 10.5 Searcher tests: the prompt embeds the filtered sources + communities + caveats + language (structure/snapshot test); copy invokes the clipboard; a result prefills the create form

## 11. End-to-end

- [ ] 11.1 Playwright web smoke (`apps/plans/e2e/plans.spec.ts`): create a plan -> it appears -> mark complete; then run a search -> see ranked sources -> generate the AI prompt
- [ ] 11.2 Maestro flow (`.maestro/plans-list.yaml`) for the same journey (runs on a simulator; documented). Acceptance: `pnpm e2e` web smoke green; Maestro flow runnable locally

## 12. Validation & verification

- [ ] 12.1 `pnpm preflight` green; `pnpm --filter plans test` green; `expo export -p web` builds
- [ ] 12.2 `supabase db push` applies `0005_plans_schema.sql`; `plans` exposed in the API schemas
- [ ] 12.3 Manual device verification of the plans list + realtime between two sessions, and the searcher prompt copy (maintainer)

## 13. Docs

- [ ] 13.1 `ARCHITECTURE.md`: note `apps/plans` as the second worked example of the add-an-app seams; reference the zone-split catalog under `apps/plans/src/sources/`
- [ ] 13.2 `apps/plans/README.md` (or the root README app list) + `CHANGELOG.md` entry for the plans app + the plan searcher

## Out of Scope

- **Live scraping / event auto-import** -- the searcher recommends where to look and generates a prompt; it never fetches a source or parses an event feed. See design.md §Non-Goals.
- **AI API integration** -- the searcher produces a prompt for the user's own AI chat; no model API, no key, no cost. See design.md §Non-Goals.
- **Backend for the catalog** -- the source catalog is committed app data, not a Supabase table; the only backend here is the `plans` schema for the user's plans. See design.md §Non-Goals.
- **Per-instance private catalog** -- one shared community dataset committed to the repo, extended by PR; not a per-couple gitignored config. See design.md §Non-Goals.
- **Full national coverage at launch** -- the catalog seeds Murcia + Alicante/Elche thoroughly plus a representative national slice and a neutral example region; exhaustive national coverage grows by contribution. See design.md §Non-Goals.
