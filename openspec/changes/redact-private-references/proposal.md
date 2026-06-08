## Why

This repository is **public** (MIT). Several committed documents — the active `ROADMAP.md`
and `openspec/AGENTS.md`, plus the archived `bootstrap-foundation` change — name and describe
the maintainer's other, **private** repositories by their internal codenames and GitHub slugs.
Naming or describing private projects in a public repo leaks information that should not be
exposed. The references must be redacted to neutral, meaning-preserving descriptions of the
role each private project plays (a Flutter reference project; a private TypeScript monorepo),
so the docs still read naturally to an outside reader who has never heard of those projects.

One of the affected files is an archived change's `design.md`, which the
`archive-doc-edit-guard` (`scripts/opsx/archive-doc-edit-guard.mjs`) protects from silent
in-place edits. Per the "Archived design docs are protected" scenario of the
`spec-driven-workflow` capability, such an edit is only permitted when an in-flight change
explicitly authorizes it by listing the archive path under `**Affected files:**` in its
`## Impact` section. This change is that authorization: a privacy-driven, factual correction
of archived prose, not a rewrite of shipped behavior.

## What Changes

- Redact private project codenames and slugs from the active docs `ROADMAP.md` and
  `openspec/AGENTS.md`, replacing each with the neutral role it plays.
- Redact the same codenames from the archived `bootstrap-foundation` change's `proposal.md`,
  `tasks.md`, and `design.md`, preserving the original technical meaning (which conventions
  were inherited from which kind of reference project).
- Reword one illustrative example in the archived `design.md` so a real personal name no
  longer appears as a sample value.
- No source code, configuration, schema, or shipped behavior changes.

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `spec-driven-workflow`: clarifies, on the "Archived design docs are protected" requirement,
  that a privacy redaction of an archived `design.md` is a legitimate authorized edit when it
  rides an in-flight change that lists the archive path under `**Affected files:**`.

## Impact

- **Affected files:** openspec/changes/archive/2026-05-26-bootstrap-foundation/design.md
  openspec/changes/archive/2026-05-26-bootstrap-foundation/proposal.md
  openspec/changes/archive/2026-05-26-bootstrap-foundation/tasks.md
  ROADMAP.md openspec/AGENTS.md
- **Affected packages**: none — documentation-only.
- **New dependencies**: none.
- **Secrets**: none touched; this change removes information leakage, it does not add config.
- **Test coverage**: none required — prose-only redaction; the existing
  `archive-doc-edit-guard` tests already cover the guard behavior this change relies on.
- **Rollback**: `git revert` of the redaction commit. The archived docs return to their prior
  wording (re-introducing the leak), so rollback is documentation-only and reversible.
- **Out of scope**: any change to source, build, CI, or the meaning of the archived design
  decisions; the `@studio/*` npm scope (it resolves to public repos and is intentionally kept).
