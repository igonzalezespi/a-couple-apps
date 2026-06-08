# Tasks

## 1. Redact active documentation

- [x] 1.1 Redact private codenames from `ROADMAP.md`, replacing each with its neutral role
- [x] 1.2 Redact private codenames from `openspec/AGENTS.md`, replacing each with its neutral role

## 2. Redact the archived bootstrap-foundation change

- [x] 2.1 Redact private codenames from the archived `proposal.md` (role-preserving)
- [x] 2.2 Redact private codenames from the archived `tasks.md` (role-preserving)
- [x] 2.3 Redact private codenames from the archived `design.md` (role-preserving), authorized
      by this change's `## Impact` `**Affected files:**` entry
- [x] 2.4 Reword the archived `design.md` example so a real personal name no longer appears

## 3. Verify

- [x] 3.1 Run a repo-wide grep for the forbidden private tokens and confirm only public
      self-references and the public `@studio/*` npm scope remain

## Out of Scope

- Any change to source, configuration, schema, CI, or shipped behavior
- The `@studio/*` npm scope, which resolves to public repos and is intentionally kept
