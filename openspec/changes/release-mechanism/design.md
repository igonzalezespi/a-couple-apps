## Context

aca is the first consumer of the studio's homogeneous release control plane: a small set of
**public, SHA-pinnable composite actions** that compute the next semver from PR labels, write
the version into a repo's manifests per stack `kind`, and promote a Keep-a-Changelog
`[Unreleased]` section. The model: the lead applies one `semver:*` label per PR into `develop`;
on the `develop`->`main` merge a release is cut from the highest label across the merged PRs.

aca's release is deliberately narrower than other repos in the studio. This design records the
aca-specific decisions; the cross-repo mechanism lives in the shared actions, not here.

## Decisions

### D1: aca releases are tag + CHANGELOG + GitHub Release ONLY — never build/publish

aca is public (MIT), carries **no secrets**, and is **never built or published from CI**: each
couple compiles the app themselves with their own Supabase/TMDB config. So the release is
strictly a version bump (root `package.json` + `apps/movies/app.config.ts`), a CHANGELOG
promotion, a `vX.Y.Z` tag, and a GitHub Release. There is no EAS, no `expo export`, no OTA, no
store submit, no build number, and no secret of any kind. Only the automatic `GITHUB_TOKEN`
is used. This is a maintainer decision and is the load-bearing constraint of this change.

### D2: `kind: expo` for `apply-version` — two manifests in lockstep

aca's version lives in **two** places that must stay equal: the root `package.json` `version`
and the `version:` field of the Expo config `apps/movies/app.config.ts`. `apply-version` with
`kind: expo` writes both (and, per its contract, no build number). Verified against the action:
its expo branch sets the root `package.json` and replaces the first `version: "..."` /
`version: '...'` property in `apps/movies/app.config.ts`. aca's config has exactly that field
(`version: '0.1.0'`) as its first `version:` property, so the regex matches. `apps/movies/app.json`
does **not** carry a version, so there is no second source of truth to drift — no mismatch.

### D3: The require-semver-label gate is advisory, not a required check

The PR check fails when a PR into `develop` lacks exactly one `semver:*` label, but it is
deliberately **its own status** and is NOT added to `ci-gate.needs`. Making it block merges is a
branch-protection decision reserved to the maintainer; this change does not touch repo
protection settings. Keeping it out of `ci-gate` also avoids coupling the existing aggregate
gate to a label that the lead may not have applied yet when CI first runs.

### D4: Multiline release notes passed by env, not YAML interpolation

`changelog-release` emits the promoted section body as a multiline `notes` output (heredoc-safe).
The release step passes it to `gh release create --notes "$NOTES"` via an environment variable
rather than `${{ ... }}` interpolation inside the shell, so arbitrary changelog content (quotes,
backticks, `$`) is handled verbatim and cannot break or inject into the shell command.

### D5: Concurrency that never cancels an in-flight release

The release workflow uses `cancel-in-progress: false`: a release commits, tags, and pushes, so a
cancelled run could leave the repo half-released. The require-semver-label gate, by contrast, is
side-effect-free and uses `cancel-in-progress: true` keyed on the PR number.

## Risks / Trade-offs

- **[First run is the live test]** → The workflow's commit/tag/push/release path cannot be fully
  exercised without an actual `push` to `main`. The action logic is tested in the actions' own
  repo, but the wiring (token permissions to push to `main` + create a Release, `git add` of the
  exact `files-changed` list, multiline notes) is validated by the first real `develop`->`main`
  merge. `workflow_dispatch` allows a deliberate dry exercise. Mitigation: rollback is a `git
  revert` plus deleting the tag/Release.
- **[Pushing the bump commit to `main`]** → The release commits the version bump directly to
  `main`. Per the studio flow, `main` is the reviewed line; this auto-commit is the release
  bookkeeping, not a feature, and rides only after the human-reviewed `develop`->`main` PR has
  merged. It must be re-synced to `develop` afterward (a routine the lead already follows for
  anything landing on `main`).
- **[Label discipline]** → A release only computes correctly if each in-range PR carries exactly
  one `semver:*` label; `compute-release-version` hard-fails otherwise. The advisory gate nudges
  this at PR time; making it mandatory is the maintainer's branch-protection call.
