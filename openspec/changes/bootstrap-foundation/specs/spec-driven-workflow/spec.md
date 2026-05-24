## ADDED Requirements

### Requirement: OpenSpec SDD workflow installed

The repository SHALL host the OpenSpec spec-driven workflow: `openspec/{config.yaml, project.md, specs/, changes/, templates/, schemas/, manual-checks/}`. Change proposals SHALL consist of `proposal.md`, `design.md`, `tasks.md`, and per-capability delta specs under `specs/<capability>/spec.md`. Requirements SHALL use RFC-2119 keywords and `#### Scenario:` blocks in GIVEN/WHEN/THEN form. Change directories SHALL carry `.openspec.yaml` and a `.opsx-state.json` validated against `schemas/opsx-state.schema.json`.

#### Scenario: A change validates against the schema

- **GIVEN** a change directory under `openspec/changes/<id>/`
- **WHEN** the opsx tooling validates it
- **THEN** the artifacts SHALL be present and well-formed
- **AND** `.opsx-state.json` SHALL conform to `opsx-state.schema.json`

#### Scenario: Tasks file passes the linter

- **GIVEN** a `tasks.md` with numbered checkbox tasks and a plain-bullet `## Out of Scope` section
- **WHEN** `opsx:tasks-md:lint` runs
- **THEN** it SHALL pass when trackable tasks use `- [ ] N.M` and scope guardrails use plain bullets

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
