## Context

The foundation (`bootstrap-foundation`) and the decoupling change (`decouple-app-schema-i18n`)
left two clean seams for adding an app without editing shared packages:

- `@aca/core` exports a cross-app `BaseDatabase` (`public` + `shared`) and a generic
  `createSupabaseClient<DB>` / `AppSupabaseClient<DB>` / `useSupabase<DB>()`, all defaulting to
  `BaseDatabase`. An app composes `<App>Database = BaseDatabase & { <schema>: ... }` and binds a
  hook, getting a typed `client.schema(...)` while never importing `@supabase/supabase-js`.
- `@aca/i18n` owns only the `common` namespace and exposes `registerAppNamespace` +
  `useAppLocale(ns)`; an app registers its own namespace with `common` as `fallbackNS`.

`apps/movies` is the worked example of both (`apps/movies/src/lib/{database.ts,useMoviesSupabase.ts}`
and `apps/movies/src/i18n/index.ts`). The "Adding an app" recipe in `ARCHITECTURE.md` codifies the
pattern. Identity is the no-auth person model: there is no login; the couple's own anon key is the
boundary; the locally-selected `couple.config` person id is written to attribution columns
(`added_by` in movies). RLS scopes the app schema to the `anon` role; a per-schema realtime
subscription invalidates the affected query.

This change adds `apps/plans` over exactly these seams, then adds a discovery feature on top.
`docs/plans-investigation.md` is the source of truth for the discovery catalog: ~150 curated
sources across three zones (Murcia; Alicante/Elche; National Spain), tagged by type (concert,
theater, cinema, museum, wine/gastronomy, astronomy/nature, manga/geek, festival, family),
priority (essential / secondary / caveat), and cadence (weekly / monthly / seasonal / annual),
plus forums/subreddits/newsletters and caveats (e.g. Wegow is in pre-insolvency -- use for
discovery, buy on the official site). The investigation's own conclusion is to monitor a curated
set on a cadence and use an AI chat to filter; the searcher operationalizes that.

Constraints: cross-platform (iOS/Android/web) from one codebase; UI only via `@aca/ui`; Supabase
only via `@aca/core`; the configured language drives any user-facing copy via `@aca/i18n`; secrets
in `.env` / `EXPO_PUBLIC_*`; no real personal data in source.

## Goals / Non-Goals

**Goals:**

- A runnable Expo app (web verifiable here; native on the maintainer's machine) that shows a
  shared, realtime, person-attributed plans/events list (create / edit / complete / delete) with
  all-day or timed dates -- built entirely from `@aca/ui`.
- Prove adding an app needs no shared-package edits: `apps/plans` composes `PlansDatabase` on
  `BaseDatabase` and registers a `plans` i18n namespace, touching only `apps/plans/` and its
  migration.
- A discovery tool (the plan searcher) that, given a date + location + categories, ranks which
  curated sources to check and generates a paste-ready AI search prompt, working fully offline over
  a committed, contributor-extensible, zone-split catalog seeded from `docs/plans-investigation.md`.
- A discovery result (or a free-form idea) can prefill "add to our plans", closing the loop from
  discovery to the shared list.

**Non-Goals:**

- **Live scraping / event auto-import** -- the searcher never fetches a source or parses an event
  feed; it recommends where to look and the user (or their AI chat) does the looking. No brittle
  scrapers, no per-site ToS exposure.
- **AI API integration** -- the searcher generates a prompt for the user's own AI chat; it does not
  call any model API, needs no API key, and incurs no cost. Matches the investigation's "use AI to
  filter" conclusion without owning an AI dependency.
- **Backend for the catalog** -- the source catalog is committed app data, not a Supabase table;
  the only backend in this change is the `plans` schema for the user's own plans/events.
- **Per-instance private catalog** -- the catalog is one shared community dataset committed to the
  repo, not a per-couple gitignored config; contributors extend it via PRs.
- **Full national coverage at launch** -- the catalog seeds Murcia and Alicante/Elche thoroughly
  (the investigation's depth) plus a representative national slice and a neutral example region;
  exhaustive national coverage grows by contribution over time.

## Decisions

### D1: `PlansDatabase` composed on `BaseDatabase`; the app imports no `@supabase/supabase-js`

`apps/plans/src/lib/database.ts` declares `PlansDatabase = BaseDatabase & { plans: { Tables: {
plans: { Row; Insert; Update; Relationships } }; Views; Functions; Enums; CompositeTypes } }`, and
`apps/plans/src/lib/usePlansSupabase.ts` binds `usePlansSupabase = () => useSupabase<PlansDatabase>()`,
exactly mirroring `apps/movies/src/lib/{database.ts,useMoviesSupabase.ts}`. Row contracts are
validated with a zod schema in `apps/plans/src/lib/plans.ts` (per-app contract; `@aca/core` holds
only shared ones).
**Why**: this is the seam the foundation built for Phase 7 -- a typed `client.schema('plans')`
without polluting `@aca/core` with app schema and without the app touching `@supabase/supabase-js`.
**Alternative considered**: add a `plans` schema to `@aca/core`'s types. Rejected -- it re-couples
the shared boundary to one app's shape, the exact regression `decouple-app-schema-i18n` removed.

### D2: A `plans` i18n namespace via `registerAppNamespace`; `common` via fallback

`apps/plans/src/i18n/index.ts` exposes `createPlansI18n(language)` (`createI18n` + 
`registerAppNamespace(instance, 'plans', { en, es })`) and `usePlansLocale = () =>
useAppLocale('plans')`, mirroring movies. Domain strings (plan fields, searcher copy) live in the
`plans` namespace; shell / person-gate / generic-action / language strings resolve from `common`
through `fallbackNS`. Each locale is guarded by a `PlansTranslationKey` key type so en/es parity is
compile-enforced per namespace.
**Why**: the app-i18n-namespaces pattern; adding the app's strings needs no `@aca/i18n` edit, and a
component mixing shell and plan strings needs only the one app hook.
**Alternative considered**: add plan strings to `common`. Rejected -- `common` is cross-app shell
only; domain strings belong to the owning app.

### D3: Plan shape, date/time handling, and anon RLS

The `plans.plans` row is:

```
{ id uuid pk, title text not null, starts_at timestamptz not null, ends_at timestamptz null,
  location text null, category text null, url text null, notes text null,
  completed boolean not null default false, created_by text null, created_at timestamptz not null }
```

`category` is free text at the DB layer (validated against the `Category` union in the app contract)
so a future category needs no migration. `created_by` is the `couple.config` person id (text, like
movies' `added_by`), not an auth user.

**Date/time (all-day vs timed).** A plan is either timed (a clock time matters, e.g. a 21:00
concert) or all-day (only the day matters, e.g. a museum open all week). Rather than a separate
boolean, the app encodes all-day as a `starts_at` normalized to local midnight with the time
component treated as not significant by the UI; a small `all_day` heuristic in the contract layer
derives the flag for rendering and for the AI prompt. (Open question Q1 revisits whether to store an
explicit `all_day boolean` -- the migration can add it cheaply if the heuristic proves fragile.)
`ends_at` is optional (a single-evening plan needs no end); when present it must be >= `starts_at`
(CHECK).

**Anon RLS** mirrors `movies.watchlist_items` (`supabase/migrations/0002_movies_schema.sql`): RLS
enabled; `anon` may SELECT / INSERT / DELETE; UPDATE is granted column-scoped (the editable plan
fields: `title, starts_at, ends_at, location, category, url, notes, completed`) so `created_by`
cannot be rewritten after insert; `grant usage on schema plans to anon`; the table is added to the
`supabase_realtime` publication (guarded for idempotent re-apply).
**Why**: identical security model to movies -- the couple's anon key is the boundary, attribution is
non-forgeable, and realtime is free. **Alternative considered**: row-level `created_by` UPDATE guard
via a policy `with check`. Rejected -- the column-scoped grant is the established, simpler pattern in
this repo and already proven for movies.

### D4: The catalog is committed, contributor-extensible app data -- split by zone (NOT Supabase, NOT gitignored)

The source catalog lives as typed TypeScript under `apps/plans/src/sources/`, **split one file per
region** -- e.g. `murcia.ts`, `alicante.ts`, `national.ts`, plus a `communities.ts` for the online
channels and an `index.ts` that assembles the registry. A contributor adds a region (or extends one)
via a small PR touching one file. The data is seeded from `docs/plans-investigation.md`.

The `Source` type:

```ts
type Category =
  | 'concert' | 'theater' | 'cinema' | 'museum'
  | 'wine-gastronomy' | 'astronomy-nature' | 'manga-geek' | 'festival' | 'family';
type Zone = 'murcia' | 'alicante' | 'national' | 'online';
interface Source {
  id: string;
  name: string;
  url: string;
  types: Category[];
  zones: Zone[];
  priority: 'essential' | 'secondary' | 'caveat';
  frequency: 'weekly' | 'monthly' | 'seasonal' | 'annual';
  howToMonitor?: string; // e.g. "Web + Instagram @cmonmurcia"
  notes?: string;        // e.g. caveat detail
}
```

Forums, subreddits, and newsletters are a sibling `Community` entry type (`{ id, name, url, kind:
'forum' | 'subreddit' | 'newsletter' | 'social', zones: Zone[], notes? }`) so the searcher can
surface "where the locals post" alongside curated sources without forcing those into the `Source`
priority/cadence model.

**Why (the maintainer's rationale)**: plans is a standalone individual app. A Supabase-backed
catalog would couple the discovery feature to a backend and break that standalone principle; a
committed file keeps the app self-contained and lets *every* contributor add data to the project via
a normal PR. The data is **public source-directory data** -- venue and source names plus public URLs
-- so it sits outside the repo's personal-data rule, which targets identity and secrets, not a
public dataset. Splitting by zone keeps each file reviewable and lets a contributor add their own
city without merge-conflicting the whole catalog.
**Alternatives considered**:
- A Supabase `plans.sources` table. Rejected -- backend coupling for static reference data, and it
  is not PR-extensible (a contributor cannot add a row via a pull request; they would need DB
  access).
- A gitignored per-instance `sources.config.ts`. Rejected -- the maintainer wants one shared
  community dataset that improves for everyone, not a private per-couple list.

### D5: No scraping, no AI API -- the searcher recommends sources and generates a prompt

The searcher does two things: (a) rank and surface which curated sources/communities to check for
the requested date/location/categories, and (b) generate a paste-ready prompt the user drops into
their own AI chat to do the filtering. It never fetches a source page, never parses an event feed,
and never calls a model API.
**Why**: robust (no brittle scrapers that break when a site changes), zero API key / cost, respects
each site's ToS, and matches the investigation's own conclusion ("save links and use the AI to
filter"). The generated prompt embeds the context (date, zone, categories, vibe), the filtered
source list with URLs, the relevant communities, the active caveats (e.g. "Wegow is discovery-only,
buy on the official site"), the desired output format, and the configured language so the AI replies
in the couple's language.
**Alternative considered**: scrape feeds / call an AI API server-side. Rejected -- brittle, costly,
ToS-fraught, and it would need a backend, contradicting the standalone-app principle (D4).

### D6: The searcher is client-side and offline

The catalog is local data, so filtering + ranking + prompt generation run entirely on-device with
no network. This is a deliberate contrast to the core plans CRUD, which does use Supabase (via
`@aca/core`) for the shared list.
**Why**: discovery should work on a train with no signal; the only "network" step is the user later
opening a recommended URL or pasting the prompt into their AI chat -- both outside the app.

### D7: Discovery -> plan handoff

A search result (or a free-form idea the user types) can prefill "add to our plans": it routes to
the plan create form with `title`, `starts_at` (defaulting to the searched date), `url` (the
source's URL when prefilled from a source), and `category` (the matched category) pre-populated; the
user confirms and saves into the core list (D3).
**Why**: discovery is only useful if it feeds the list; a one-tap "add this" closes the loop without
re-typing.

## Risks / Trade-offs

- **Expo + Tamagui Babel + Metro + RN-Web integration is finicky** -> mirror the proven
  `apps/movies` config (`babel.config.js`, `metro.config.js`, `app.config.ts`, `tsconfig.json`);
  scaffold-first slice renders one `@aca/ui` screen and builds for web before adding features.
- **Native un-verifiable in this sandbox** -> deliver and verify the web target here; document
  native run steps; author the Maestro flow but run it on the maintainer's machine.
- **Catalog staleness** (festival dates, a venue closes, Wegow's status changes) -> the catalog is
  reference + cadence, not live data; entries carry `notes` for caveats and the searcher always
  defers final verification to the user/AI. Contributions keep it fresh (D4).
- **Date/time correctness across platforms** (timezones, all-day vs timed) -> keep dates as
  `timestamptz`; render with the device locale; derive the all-day flag in one contract helper so
  the rule is tested once (D3, Q1).
- **Catalog size in the bundle** -> ~150 typed entries is small (text only); zone-split files keep
  it tree-shakeable and reviewable. If it ever grows large, lazy-load per zone.
- **Prompt quality** -> the prompt is a template; cover it with a snapshot/structure test so a
  catalog or copy change cannot silently degrade it.

## Migration Plan (implementation slices)

Core plans first; the searcher is the final slice.

1. **Scaffold** -- `apps/plans` Expo app mirroring movies (Expo Router, Tamagui Babel,
   `eslint-config-expo`); renders an `@aca/ui` screen with `@aca/i18n` strings; web build green.
2. **Schema** -- `0005_plans_schema.sql` (the `plans` table + CHECK + anon RLS + column-scoped
   UPDATE grant + realtime publication); apply to the live DB; expose `plans` in the API schemas.
3. **Typed client + contract** -- `PlansDatabase` + `usePlansSupabase` + the zod row contract.
4. **i18n** -- the `plans` namespace (`createPlansI18n` + `usePlansLocale`) with en/es and the
   `PlansTranslationKey` guard.
5. **Plans list + data hooks** -- `@aca/core`-based list / create / edit / complete / delete hooks;
   the list + create/edit UI from `@aca/ui`, with all-day vs timed date handling.
6. **Realtime** -- subscribe via `subscribeCoupleChannel` (schema `plans`); invalidate the plans
   query on change; unsubscribe on unmount.
7. **States + polish** -- loading / empty / error states; everything via `@aca/ui` + `@aca/i18n`.
8. **Plan searcher (final)** -- the zone-split catalog module (types + data + index, seeded from the
   investigation + a neutral example region); the search form; the filter+rank logic; the "where to
   search" results UI (tappable URLs, grouped, how-to-monitor, communities); the AI-prompt generator
   + copy-to-clipboard; the discovery -> add-to-plans handoff; searcher i18n + tests.
9. **e2e + docs** -- Playwright web smoke + Maestro native flow; ARCHITECTURE / README / CHANGELOG.

Each slice is its own commit, verified (web) before the next.

## Open Questions

- **Q1**: Store an explicit `all_day boolean` column, or derive it from a normalized `starts_at`?
  Proposal: derive in the contract helper first (no extra column); add the column in a follow-up
  migration only if the heuristic proves fragile across timezones.
- **Q2**: Should completed plans stay in the main list (greyed) or move to a separate "past"
  section? Proposal: keep in-list, sorted after upcoming, with a completed treatment -- mirrors the
  movies watched-state pattern; revisit if the list grows long.
- **Q3**: Should the searcher offer a "remind me to check on <cadence>" nudge (e.g. weekly for local
  agendas)? Proposal: out of scope for this change (no notifications); the searcher surfaces the
  cadence as guidance text only.
- **Q4**: One QueryClient / Supabase client instance shared with `apps/movies`, or per-app? Proposal:
  per-app (each app creates its own at root), consistent with the movies decision.
