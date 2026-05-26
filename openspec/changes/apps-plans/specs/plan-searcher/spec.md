## ADDED Requirements

### Requirement: Committed, zone-split, contributor-extensible source catalog

The searcher SHALL read from a source catalog that is committed TypeScript app data under
`apps/plans/src/sources/`, NOT a Supabase table and NOT gitignored. The catalog SHALL be split one
file per region (e.g. `murcia`, `alicante`, `national`) plus an online-communities file and an
index that assembles the registry, so a contributor SHALL be able to add or extend a region via a
small pull request touching one file. Each `Source` entry SHALL carry an id, a name, a URL, its
categories (`types`), its zones, a priority (`essential` / `secondary` / `caveat`), a cadence
(`frequency`: weekly / monthly / seasonal / annual), and optional `howToMonitor` / `notes`.
Forums, subreddits, and newsletters SHALL be represented as `Community` entries.

#### Scenario: Catalog ships as committed app data

- **GIVEN** a clean checkout of the repository
- **WHEN** the searcher loads its catalog
- **THEN** the catalog SHALL be available with no network call and no per-instance configuration
- **AND** it SHALL NOT be read from Supabase

#### Scenario: A contributor adds a region by PR

- **GIVEN** the zone-split catalog under `apps/plans/src/sources/`
- **WHEN** a contributor adds a new region file and registers it in the index
- **THEN** its sources SHALL become available to the searcher
- **AND** no shared package and no backend SHALL need editing

### Requirement: Search input (date, location, categories)

The searcher SHALL accept a date, one or more zones (locations), and one or more categories, and
MAY accept an optional free-text vibe, as the basis for ranking which sources to check.

#### Scenario: A search is parameterized

- **GIVEN** the search form
- **WHEN** the user picks a date, one or more zones, and one or more categories (and optionally a
  vibe)
- **THEN** those inputs SHALL drive the ranking
- **AND** the user SHALL be able to run the search with them

### Requirement: Ranking (zone n category, essential-first, cadence-vs-date, caveats)

The searcher SHALL keep only sources whose zones intersect the chosen zones AND whose categories
intersect the chosen categories. It SHALL order results essential-first (by priority), SHALL weight
sources by their cadence relative to how near the chosen date is (a high-cadence local agenda
SHALL rank ahead of an annual festival for a near date, and a seasonal/annual source SHALL gain
weight for a far date), and SHALL flag any source carrying a caveat (priority `caveat` or a caveat
`notes`, e.g. Wegow in pre-insolvency).

#### Scenario: Filter by zone intersect category

- **GIVEN** a search for zone "murcia" and category "concert"
- **WHEN** the searcher ranks the catalog
- **THEN** only sources whose zones include "murcia" AND whose types include "concert" SHALL appear

#### Scenario: Essential sources rank first

- **GIVEN** a result set mixing essential and secondary sources
- **WHEN** it is ordered
- **THEN** the essential sources SHALL appear before the secondary ones

#### Scenario: Cadence is weighted against the date

- **GIVEN** a near-term date
- **WHEN** the results are ranked
- **THEN** a weekly/monthly local agenda SHALL outrank a seasonal/annual festival
- **AND** for a far-future date a seasonal/annual source SHALL gain ranking weight

#### Scenario: Caveats are flagged

- **GIVEN** a source carrying a caveat (e.g. a platform in pre-insolvency)
- **WHEN** it appears in the results
- **THEN** it SHALL be flagged with its caveat (e.g. "use for discovery, buy on the official site")

### Requirement: "Where to search" output

The searcher SHALL present the ranked sources with tappable URLs (opening via the platform's link
handler), grouped for scanning, each with its `howToMonitor` guidance, and SHALL surface the
relevant communities (forums / subreddits / newsletters) alongside the curated sources.

#### Scenario: Sources are tappable and annotated

- **GIVEN** a ranked result set
- **WHEN** it renders
- **THEN** each source SHALL show a tappable URL that opens externally
- **AND** SHALL show its how-to-monitor guidance
- **AND** the relevant communities SHALL be surfaced alongside

### Requirement: "AI prompt" output

The searcher SHALL generate a paste-ready prompt for the user's own AI chat that embeds the search
context (date, zone(s), categories, and any vibe), the filtered sources with their URLs, the
relevant communities, the active caveats, the desired output format, and the configured language so
the AI replies in the couple's language. The prompt SHALL be copyable to the clipboard. The
searcher SHALL NOT call any AI API and SHALL NOT scrape any source.

#### Scenario: The prompt embeds context and sources

- **GIVEN** a completed search
- **WHEN** the user generates the AI prompt
- **THEN** the prompt SHALL include the date, zone(s), categories, and vibe
- **AND** SHALL include the filtered sources with URLs, the communities, and the caveats
- **AND** SHALL state the desired output format and the configured language

#### Scenario: The prompt is copied, not executed

- **GIVEN** the generated prompt
- **WHEN** the user taps copy
- **THEN** it SHALL be placed on the clipboard for pasting into an external AI chat
- **AND** the app SHALL NOT itself call any AI API or fetch any source

### Requirement: Works offline

The searcher SHALL produce its ranked sources and its AI prompt with no network access, because the
catalog is local data and the ranking and prompt generation run on-device.

#### Scenario: Discovery with no connectivity

- **GIVEN** a device with no network connection
- **WHEN** the user runs a search and generates the prompt
- **THEN** the ranked sources and the prompt SHALL be produced successfully
- **AND** the only steps needing the network (opening a source URL, pasting the prompt into an AI
  chat) SHALL be external to the app

### Requirement: A result can prefill a plan

A search result, or a free-form idea the user types, SHALL be able to prefill the create-plan form
so discovery feeds the shared plans list. The prefill SHALL populate at least the title, the start
date (defaulting to the searched date), and, when prefilled from a source, the URL and category.

#### Scenario: Add a discovered idea to the plans list

- **GIVEN** a search result (or a typed idea)
- **WHEN** the user chooses "add to our plans"
- **THEN** the create-plan form SHALL open prefilled (title, start date, and URL/category when from
  a source)
- **AND** on confirmation the plan SHALL be saved into the shared plans list
