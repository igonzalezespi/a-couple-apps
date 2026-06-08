## Why

aca releases have been ad-hoc. The studio now has a homogeneous, repo-agnostic release
control plane (a small set of public, SHA-pinnable composite actions) and aca is the **first
consumer and the validator** of it. Wiring it in gives aca a deterministic, label-driven
release: the lead picks one semver label per PR, and the `develop`->`main` merge cuts the
release with no manual version edits.

aca has a hard, repo-specific constraint that shapes this: **aca is NEVER built or published
from CI.** It is a public (MIT) repo with no secrets, and each couple compiles the app
themselves with their own Supabase/TMDB config. So the release here is deliberately *only* a
version bump + CHANGELOG promotion + `vX.Y.Z` tag + GitHub Release — no EAS, no build, no
publish, no store submit, no build number, and no secrets. Only the automatic `GITHUB_TOKEN`
is used. (This narrowing is a maintainer decision, recorded in the design.)

## What Changes

- Add the four release labels `semver:major|minor|patch|none` as a committed `.github/labels.yml`
  (name + color + description), synced to the repo idempotently with `gh label create --force`.
- Add `.github/workflows/release.yml` — on the `develop`->`main` merge (`push` to `main`) and
  `workflow_dispatch`. It reads the current version, computes the next semver from the merged
  PRs' labels, and **only if a release is due** applies the version (root `package.json` +
  `apps/movies/app.config.ts`), promotes the CHANGELOG `[Unreleased]` section, commits, tags,
  pushes, and creates the GitHub Release. bump=none is a logged no-op. No build/publish steps.
- Add `.github/workflows/require-semver-label.yml` — a PR check on PRs into `develop` that
  passes iff exactly one `semver:*` label is present. **Advisory:** it is its own status and is
  deliberately NOT in `ci-gate.needs`; branch protection is a separate maintainer decision.
- Consume the studio's shared release actions, **SHA-pinned** (`compute-release-version`,
  `apply-version` with `kind: expo`, `changelog-release`).
- No application source, schema, or runtime behavior changes. No secrets added or referenced.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `ci`: adds a label-driven release mechanism (semver-label -> version bump on the
  `develop`->`main` merge), scoped for aca to tag + CHANGELOG promotion + GitHub Release ONLY
  (no build/publish/secrets, by maintainer decision), plus an advisory require-semver-label PR
  gate that is its own status and not part of `ci-gate`. Consumes the studio's shared,
  SHA-pinned release actions.

## Impact

- **Affected files:** `.github/labels.yml` (new), `.github/workflows/release.yml` (new),
  `.github/workflows/require-semver-label.yml` (new), `CHANGELOG.md` (this entry under
  `[Unreleased]`), and this change's OpenSpec artifacts.
- **Affected packages:** none — CI/release wiring only; no app or package source changes.
- **New dependencies:** none in-repo. The workflows consume the studio's public, SHA-pinned
  composite actions (referenced directly because they are public).
- **Secrets:** none. The release uses only the automatic `GITHUB_TOKEN`; aca stays secret-free.
- **Test coverage:** none in-repo — the actions are tested in their own repo. The first real
  `develop`->`main` merge is the live validation of the wiring (see the design's risks).
- **Rollback:** `git revert` the wiring commit and (if a release was cut) delete the tag +
  GitHub Release; the version bump is itself a normal commit that can be reverted.
- **Out of scope:** any build, EAS, OTA, publish, or store-submit step; build numbers; branch
  protection / required-status changes (a separate maintainer decision); changes to the shared
  release actions themselves.
