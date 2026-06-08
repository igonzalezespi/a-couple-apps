# Tasks

## 1. Release labels

- [x] 1.1 Add a committed `.github/labels.yml` with `semver:major|minor|patch|none`
      (name + color + description)
- [x] 1.2 Sync the labels to the repo idempotently with `gh label create ... --force`

## 2. Release workflow

- [x] 2.1 Add `.github/workflows/release.yml` triggered on `push` to `main` + `workflow_dispatch`,
      with top-level `concurrency` and `permissions: { contents: write, pull-requests: read }`
- [x] 2.2 Read the current version from the root `package.json`
- [x] 2.3 Call `compute-release-version` (SHA-pinned) to get the next semver from the merged PRs'
      `semver:*` labels
- [x] 2.4 When a release is due: `apply-version` (`kind: expo`) -> `changelog-release` ->
      commit `chore(release): vX.Y.Z` -> tag -> push -> `gh release create`
- [x] 2.5 When bump=none: log a no-op (no commit, tag, or release)
- [x] 2.6 No build/EAS/publish/store-submit/build-number/secret steps anywhere

## 3. Advisory semver-label gate

- [x] 3.1 Add `.github/workflows/require-semver-label.yml` on PRs into `develop`
      (`opened, labeled, unlabeled, synchronize`) with top-level `concurrency`
- [x] 3.2 Pass iff exactly one `semver:*` label is present; else fail with a clear message
- [x] 3.3 Keep it OUT of `ci-gate.needs` — it is its own advisory status

## 4. Verify

- [x] 4.1 Confirm `apply-version expo` targets the existing `version:` field in
      `apps/movies/app.config.ts` (and note any mismatch, e.g. version living in `app.json`)
- [x] 4.2 Ensure `CHANGELOG.md` has an `## [Unreleased]` section for `changelog-release` to promote
- [x] 4.3 `pnpm openspec:validate` and Prettier pass

## Out of Scope

- Any build, EAS, OTA, publish, or store-submit step; build numbers
- Branch protection / required-status configuration (a separate maintainer decision)
- Changes to the shared release actions themselves
- Any secret added to or referenced by aca
