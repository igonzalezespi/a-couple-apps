# Manual Checks Library

Reusable recipes for human-verification steps that `/opsx:verify` cannot perform autonomously: visual/UI checks, third-party dashboard probes, secret rotation drills, hardware inspections, and environment-specific behavior.

Each recipe lives in a single markdown file named `<category>-<subject>.md` (kebab-case) and is referenced by ID from `verify-report.md` `## Manual Actions Required` entries. When `/opsx:archive` runs, it creates a GitHub issue per manual action (labels `opsx:manual-action`, `opsx:manual-action:<origin-change>`, `needs:manual-qa`) whose body links to the library recipe — the recipe stays the single source of truth for the actual steps.

## File Schema

Every recipe must have this structure:

```markdown
---
id: ui-visual-regression-dashboard
category: visual
estimated_minutes: 10
tools: [browser, chrome-devtools-mcp]
---

## Steps

1. …

## Pass Criteria

- …

## Why Agent Can't Verify

- …
```

### Front-matter fields

| Field               | Type                | Required | Notes                                                                                                        |
| ------------------- | ------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `id`                | string (kebab-case) | yes      | Must equal the file basename without `.md`. Used by `verify-report.md` to reference the recipe.              |
| `category`          | enum                | yes      | One of: `visual`, `third-party`, `environment`, `secrets`, `human-judgment`, `hardware`.                     |
| `estimated_minutes` | positive integer    | yes      | Rough wall-clock time for the human check. Used by dashboards / prioritization.                              |
| `tools`             | array of strings    | yes      | Tools needed (e.g. `[browser, chrome-devtools-mcp]`, `[gcloud-console]`, `[physical-device]`). May be empty. |

### Required H2 body sections (in order)

1. **`## Steps`** — numbered list of concrete actions the human performs.
2. **`## Pass Criteria`** — observable outcomes that confirm the check passed. Explicit and bullet-listed.
3. **`## Why Agent Can't Verify`** — 1–2 sentences explaining what blocks automation (e.g. requires visual judgment, needs a physical device, third-party SaaS with no API, needs human authorization).

## Naming Conventions

- Files: `<category>-<subject>.md` (e.g. `visual-dashboard-regression.md`, `secrets-rotation-drill.md`).
- IDs: match file name without `.md`, stable across renames (rename the ID when you rename the file).

## Extract-on-Recurrence Rule

The verify report author SHOULD inline manual-check steps only when no library recipe matches. If the same inline steps appear in a second change's `verify-report.md`, extract them into a new recipe in this directory. Future reports should reference the recipe ID instead of re-inlining.

## Linter

```bash
node scripts/opsx/lint-manual-checks.mjs openspec/manual-checks/
```

Validates front-matter fields, required body sections, and naming conventions. Exits non-zero on any error.

## Seed Recipes

The library starts empty. Add a recipe the second time the same inline manual-action steps show up in a `verify-report.md` — extract them once, then reference the recipe ID from future reports.

New recipes should follow the schema above and pass the linter before being committed.
