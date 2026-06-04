<!-- opsx tooling last synced from a-couple-apps@111ecde on 2026-06-04 -->

# opsx tooling provenance

This repository (`a-couple-apps`) is the **canonical source** of the opsx
tooling — the zero-dependency Node scripts under `scripts/opsx/`, their report
templates under `openspec/templates/`, and the `opsx:*` npm scripts in
`package.json`. The sibling repos (`a private TS monorepo`, `a Flutter project`) sync this tooling
from here; `a Flutter project` is co-canonical.

When the tooling changes, update the provenance comment on the first line of
this file to the short SHA of the `a-couple-apps` `develop` commit the synced
state corresponds to, plus the sync date (`YYYY-MM-DD`). The downstream repos
carry their own copy of this line pointing at the aca SHA they last pulled
from, so drift is auditable from either side.

## What "the opsx tooling" covers

- `scripts/opsx/*.mjs` — state machine, report parsers/linters, tasks-md and
  manual-checks linters, archive-doc edit guard, post-archive safety check.
- `scripts/opsx/*.test.mjs` — the `node --test` suites that pin their behavior.
- `openspec/templates/{verify-report,review-report}.md` — the strict report
  schemas the linters enforce.
- The `opsx:*` (and `openspec:validate`) npm scripts that wrap them.

Keep the script names, CLI verbs, and template schemas identical across repos;
only the invocation runner (plain `node`, zero-dep) is allowed to differ.

## Known opsx pitfalls

- `openspec validate --strict` does **not** check that `MODIFIED`/`RENAMED`
  delta headers resolve against the base specs — only `/opsx:archive` does. A
  delta whose header names a requirement/spec that does not exist in the base
  will pass `validate` and only fail at archive time. Cross-check
  `MODIFIED`/`RENAMED` headers against the base spec by hand at propose time
  (bit `a private TS monorepo` `p2-29` twice).
- Manual-action GitHub issues use the `[manual]` title prefix and the
  `opsx:manual-action` + `opsx:manual-action:<origin-change>` labels (see
  `.claude/commands/opsx/archive.md` step 16). Deferred-work issues use a plain
  title (no prefix) and the `opsx:deferred` labels. Keep the `[manual]` prefix
  so the two backlogs stay separable.
