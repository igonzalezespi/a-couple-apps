## Context

The repository is public. Committed documentation references the maintainer's private
repositories by codename and slug. This change is a privacy redaction, authored as an
OpenSpec change solely so the `archive-doc-edit-guard` accepts the one archived `design.md`
edit it would otherwise reject.

## Decisions

### D1: Meaning-preserving role substitution, not deletion

Each private reference is replaced by the generic role it plays, never simply deleted:

- enumerations of the studio's products → "all the studio's products" / "every studio project";
- the private React/TypeScript monorepo → "the private TS monorepo" (or "the base config"
  where context calls for it);
- the private Flutter project → "a Flutter project" / "the Flutter project";
- a sample personal name used as an example value → a neutral phrase ("real personal names").

This keeps every sentence grammatical and keeps the original technical intent (which
convention came from which kind of reference project) intact for an outside reader.

### D2: Authorize the archived `design.md` edit via this in-flight change

`scripts/opsx/archive-doc-edit-guard.mjs` rejects in-place edits to
`openspec/changes/archive/*/design.md` unless an in-flight `proposal.md` lists the path under
`**Affected files:**` in its `## Impact` section. This change's `proposal.md` does exactly
that, so both the pre-commit hook and any future CI wiring of the guard pass legitimately —
no `--no-verify` or other bypass is used.

### D3: Keep the `@studio/*` npm scope

The `@studio/eslint-config` and `@studio/tsconfig` package scope resolves to **public**
GitHub repos (`github:igonzalezespi/eslint-config`, `github:igonzalezespi/tsconfig`) and is
intentionally left untouched. It does not name a private repository.

## Risks / Trade-offs

- **[Reintroducing a leak via a future copy-paste]** → Mitigation: a repo-wide grep for the
  forbidden tokens is run as the acceptance check; the redactions read naturally so there is
  no incentive to revert them.
- **[Archived doc no longer matches a private repo's literal name]** → Accepted: the archived
  design records *which kind* of reference project a convention came from, which the
  role-based wording preserves; the literal private name is precisely what must not appear.
