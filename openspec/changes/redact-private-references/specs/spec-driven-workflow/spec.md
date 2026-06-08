## MODIFIED Requirements

### Requirement: opsx/osx automation and Claude Code setup

The repository SHALL include the pruned opsx automation (`scripts/opsx/*.mjs`: state, project-config, verify/review report parsers and linters, lint-tasks-md, lint-manual-checks, archive-doc guard, post-archive safety check) and the `.claude/` setup (agents, `opsx`/`osx` commands, `openspec-*`/`osx-*`/`sdd-workflow` skills, settings). Flutter-specific and other-repo-specific automation SHALL NOT be ported.

#### Scenario: Verify report schema is enforced

- **GIVEN** a `verify-report.md` produced for a change
- **WHEN** `opsx:verify-report:lint` runs
- **THEN** it SHALL fail on any heading reorder, missing section, or omitted `_None_` sentinel

#### Scenario: Archived design docs are protected

- **GIVEN** an attempt to edit an archived change's `design.md`
- **WHEN** the archive-doc guard runs in pre-commit or CI
- **THEN** the edit SHALL be rejected unless an in-flight change explicitly authorizes it

#### Scenario: A privacy redaction of an archived design doc is authorized

- **GIVEN** an archived change's `design.md` names or describes a private repository in this public repo
- **AND** an in-flight change lists that archive path under `**Affected files:**` in its `## Impact` section
- **WHEN** the archive-doc guard runs
- **THEN** the meaning-preserving redaction SHALL be accepted without any `--no-verify` or other bypass
