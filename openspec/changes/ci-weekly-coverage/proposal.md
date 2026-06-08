## Why

Coverage instrumentation slows the test run, and on a small two-person project the
per-commit coverage delta is noise: nobody reads it on every PR. Folding coverage into the
required `ci-gate` would either make every PR slower or risk wedging `develop` on a flaky
coverage upload — for no benefit. We want a periodic snapshot of where coverage stands, not a
gate.

So coverage becomes a **separate, non-blocking, activity-driven** workflow. It is the same
canonical shape every studio repo uses: it fires on push to `develop` and a shared composite
action (`coverage-stale-gate`) throttles execution to **at most one run per 7 days** by
inspecting this workflow's own run history. This repo's runners are GitHub-hosted (always on),
so a cron *would* work here — but we use the identical activity-driven file for homogeneity
across all four studio repos, so the pattern is learned and maintained once.

Coverage is **greenfield** in this repo: there is no coverage script, tool, or external
service today. This change adds the minimal stack to produce lcov reports and publishes them
as a CI artifact. It is deliberately **not** wired into `quality-gates.yml`'s `ci-gate`, so it
can never block a PR.

## What Changes

- **Greenfield coverage stack** (Vitest 4 / `@vitest/coverage-v8`):
  - Add `@vitest/coverage-v8` (pinned to the installed Vitest minor) as a dev dependency to
    every package that has tests: `apps/movies`, `packages/config`, `packages/core`,
    `packages/i18n`, `packages/ui`.
  - Add a `coverage` block with the **lcov** reporter (plus a `text` summary for local runs)
    to each package's `vitest.config.ts`, scoped to that package's `src`.
  - Add a per-package `"test:coverage": "vitest run --coverage"` script.
  - Add a root `"test:coverage": "turbo run test:coverage"` script and a Turbo `test:coverage`
    task with `outputs: ["coverage/**"]` so the reports are cacheable.
- **Activity-driven weekly coverage workflow** `.github/workflows/coverage.yml`:
  - Triggers on `push` to `develop` and `workflow_dispatch`; top-level `concurrency`
    (`coverage-${{ github.ref }}`, cancel-in-progress).
  - `permissions: contents: read` + `actions: read`.
  - A `gate` job runs `coverage-stale-gate` (throttle to ≤1 run / 7 days); a `coverage` job
    runs only when `gate` reports `stale == 'true'`.
  - The `coverage` job reuses `./.github/actions/setup-repo`, runs `pnpm test:coverage`
    (`continue-on-error`, non-blocking), then publishes the per-package lcov reports as a
    build **artifact**.
- **No change to the per-PR path.** `quality-gates.yml`'s `test` job keeps running `pnpm test`
  (no coverage), and `coverage.yml` is **not** in `ci-gate.needs`.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `ci`: adds a requirement for an activity-driven, non-blocking weekly coverage workflow,
  separate from the required `ci-gate`, and a greenfield coverage stack (Vitest v8 lcov
  reporter, per-package + root `test:coverage`, Turbo outputs) whose reports are published as a
  secret-free CI artifact.

## Impact

- **Affected files:**
  - `.github/workflows/coverage.yml` (new)
  - `apps/movies/vitest.config.ts`, `packages/config/vitest.config.ts`,
    `packages/core/vitest.config.ts`, `packages/i18n/vitest.config.ts`,
    `packages/ui/vitest.config.ts` (coverage block)
  - `apps/movies/package.json`, `packages/config/package.json`, `packages/core/package.json`,
    `packages/i18n/package.json`, `packages/ui/package.json` (dev dep + `test:coverage` script)
  - `package.json` (root `test:coverage` script)
  - `turbo.json` (`test:coverage` task + `coverage/**` outputs)
- **Affected packages:** `movies`, `@aca/config`, `@aca/core`, `@aca/i18n`, `@aca/ui`.
- **New dependencies:** `@vitest/coverage-v8` (dev only), pinned to the installed Vitest minor.
- **Secrets:** **none, by design.** This is a PUBLIC repo, so no `CODECOV_TOKEN` (or any
  secret) is added. Reports are published as a CI artifact rather than uploaded to Codecov —
  the deterministic, secret-free choice over a flaky tokenless upload. A tokenless Codecov
  upload could be substituted later without any secret if a hosted trend view is wanted.
- **Personal data:** **none.** Coverage measures only `src/**` of internal packages; no PII
  appears in coverage paths, file lists, or the lcov reports. CI provides the neutral
  `couple.config.example.ts` placeholder via the existing `setup-repo` composite — no real
  config, names, or device identifiers are ever read.
- **Runners:** `ubuntu-latest` (GitHub-hosted) for both jobs, per the public-repo policy
  (never self-hosted).
- **Test coverage:** the workflow is non-blocking (`continue-on-error`) and excluded from
  `ci-gate`, so a coverage failure can never wedge `develop`.
- **Rollback:** `git revert` of this change. Removing `coverage.yml`, the coverage scripts,
  the dev dep, and the Turbo task returns the repo to per-PR `pnpm test` with no coverage.
- **Out of scope:** any coverage *threshold* or gate; uploading to Codecov or any hosted
  service; coverage for the e2e suites (Playwright/Maestro); adding coverage to the per-PR
  `ci-gate`.
