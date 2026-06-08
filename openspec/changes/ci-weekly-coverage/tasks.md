# Tasks

## 1. Greenfield coverage stack

- [x] 1.1 Add `@vitest/coverage-v8` (pinned to the installed Vitest minor) as a dev dependency
      to `apps/movies`, `packages/config`, `packages/core`, `packages/i18n`, `packages/ui`
- [x] 1.2 Add a `coverage` block (v8 provider, `['text', 'lcov']` reporter, `src`-scoped
      include) to each of the five `vitest.config.ts` files
- [x] 1.3 Add a per-package `"test:coverage": "vitest run --coverage"` script to each of the
      five packages
- [x] 1.4 Add a root `"test:coverage": "turbo run test:coverage"` script
- [x] 1.5 Add a Turbo `test:coverage` task with `outputs: ["coverage/**"]`
- [x] 1.6 Run `pnpm test:coverage` locally and confirm each package emits `coverage/lcov.info`

## 2. Activity-driven weekly coverage workflow

- [x] 2.1 Add `.github/workflows/coverage.yml` triggering on `push: develop` +
      `workflow_dispatch`, with top-level `concurrency` (`coverage-${{ github.ref }}`,
      cancel-in-progress) and `permissions: contents: read` + `actions: read`
- [x] 2.2 Add a `gate` job on `ubuntu-latest` using `coverage-stale-gate` (SHA-pinned,
      `workflow: coverage.yml`, `branch: develop`, `max-age-days: '7'`)
- [x] 2.3 Add a `coverage` job (`needs: gate`, `if: needs.gate.outputs.stale == 'true'`) on
      `ubuntu-latest`: checkout → `./.github/actions/setup-repo` → `pnpm test:coverage`
      (`continue-on-error`) → upload per-package lcov as an artifact
- [x] 2.4 Confirm `coverage.yml` is NOT listed in `quality-gates.yml`'s `ci-gate.needs`

## 3. Verify

- [x] 3.1 SHA-pin every third-party action with a trailing version comment
- [x] 3.2 Confirm no secret is referenced anywhere in the workflow (artifact, not Codecov)
- [x] 3.3 Run `pnpm openspec:validate` and `prettier --check` clean

## Out of Scope

- Any coverage threshold or gate, or adding coverage to the required `ci-gate`
- Uploading to Codecov or any hosted service (kept secret-free; artifact only)
- Coverage for the e2e suites (Playwright / Maestro)
