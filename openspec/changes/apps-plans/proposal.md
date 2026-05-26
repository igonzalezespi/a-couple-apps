## Why

App 2: a shared plans/events list for the couple -- the second end-user app and the Phase 7
deliverable. Where the movies app validated the foundation, this app proves the "adding an app is
a drop-in" goal against the decoupled seams that landed since: `@aca/core`'s cross-app
`BaseDatabase` + generic client/hook and `@aca/i18n`'s `common` namespace + `registerAppNamespace`
/ `useAppLocale`. Adding `apps/plans` must touch only `apps/plans/` (and its Supabase migration),
never the shared package internals -- exactly the Phase 7 acceptance criterion.

The app also adds a discovery tool. A couple does not just track plans they already have; the hard
part is finding plans worth adding. `docs/plans-investigation.md` catalogs ~150 curated cultural
and leisure sources across Murcia, Alicante/Elche, and national Spain, and concludes with a clear
workflow: monitor a curated set of sources on a cadence and use an AI chat to filter. The **plan
searcher** turns that catalog into a tool: given a date, location, and categories, it ranks which
curated sources to check and generates a paste-ready prompt for the user's own AI chat. It is the
final capability of this change.

## What Changes

- Scaffold an Expo app at `apps/plans` (Expo Router, React Native Web) mirroring `apps/movies`,
  consuming `@aca/ui`, `@aca/core`, `@aca/i18n`, `@aca/config` -- and requiring no edits to the
  shared packages.
- Add a Supabase **`plans` schema** (a `plans` table for plans/events) with anon RLS + realtime,
  separate from `shared` and `movies`, composed into a typed `PlansDatabase` via the generic
  `@aca/core` client/hook (the app never imports `@supabase/supabase-js`).
- Implement the **shared plans list**: create -> edit -> complete -> delete, attributed to the
  selected `couple.config` person, shared and realtime-synced between the two people, all through
  `@aca/core` hooks. Plans carry a date/time (all-day or timed), optional location, category, URL,
  and notes.
- Register a `plans` **i18n namespace** (`createPlansI18n` + `usePlansLocale`) per the
  app-i18n-namespaces pattern; `common` shell strings fall through.
- Add the **plan searcher** (the final capability): a typed, committed, zone-split source catalog
  under `apps/plans/src/sources/` (seeded from `docs/plans-investigation.md`); a search form (date
  / zone(s) / categories / optional vibe); filter+rank logic (zone n category, essential-first,
  date-vs-cadence weighting, surfacing communities and flagging caveats); a "where to search"
  results UI (tappable URLs, grouped, with how-to-monitor); an AI-prompt generator with
  copy-to-clipboard; and a discovery -> add-to-plans handoff that prefills a new plan.
- Add tests (Vitest + RN-Web component, hook, searcher logic), a Playwright web smoke, and a
  documented Maestro native flow for the primary journey.

## Capabilities

### New Capabilities

- `shared-plans`: a person-attributed, realtime-synced shared plans/events list (create / edit /
  complete / delete) with all-day or timed dates, built entirely from `@aca/ui` and reaching
  Supabase only through `@aca/core`.
- `plan-searcher`: an offline discovery tool over a committed, contributor-extensible, zone-split
  source catalog that ranks which curated sources to check for a given date / location /
  categories and generates a paste-ready AI search prompt; a result can prefill a new plan.

### Modified Capabilities

_(none -- App 2 consumes the shared packages without changing their public APIs.)_

## Impact

- **Packages consumed**: `@aca/ui`, `@aca/core`, `@aca/i18n`, `@aca/config` -- unchanged. Adding
  the app touches only `apps/plans/` and its migration (the Phase 7 acceptance criterion).
- **New files**: `apps/plans/**` (Expo app, the `plans` i18n namespace, the zone-split source
  catalog under `apps/plans/src/sources/`), `supabase/migrations/0005_plans_schema.sql`,
  `.maestro/plans-*.yaml`, `apps/plans/e2e/plans.spec.ts`.
- **New (app-scoped) deps**: `expo`, `expo-router`, `expo-localization`,
  `@react-native-async-storage/async-storage`, `react-native`, `react-native-web`,
  `@tamagui/babel-plugin`, `eslint-config-expo` (all already used by `apps/movies`), plus
  `expo-clipboard` (copy the AI prompt) and `expo-linking` / RN `Linking` (open source URLs).
- **Backend**: a `plans` Postgres schema (one `plans` table) + anon RLS (non-rewritable
  `created_by`, like movies' `added_by`) + realtime publication; the `shared` schema comes from
  `bootstrap-foundation`. The searcher catalog is **committed app data**, not a backend table --
  no Supabase, no gitignore (see `design.md` D4).
- **Secrets**: none new (`SUPABASE_URL`, `SUPABASE_ANON_KEY` already exist; surfaced as
  `EXPO_PUBLIC_*`). The searcher has no API key (it generates a prompt; it does not call any AI or
  scrape any site -- see `design.md` D5).
- **Personal-data rule**: the catalog is public source-directory data (venue/source names + public
  URLs), so it sits outside the repo's personal-data rule, which targets identity and secrets, not
  a public dataset. No real person names ship.
- **Environment limits**: iOS/Android builds and Maestro flows require a simulator/device and run
  on the maintainer's machine; the web (React Native Web) target is buildable/verifiable in CI and
  this environment. Native steps are documented, not executed here.
- **Test coverage**: app component + hook + searcher-logic tests (Vitest + RN-Web), a web e2e smoke
  (Playwright), and a documented Maestro flow.
- **Rollback**: additive (new app + migration); `git revert` the commits and drop the `plans`
  schema.
- **Out of scope**: see `design.md` §Non-Goals.
