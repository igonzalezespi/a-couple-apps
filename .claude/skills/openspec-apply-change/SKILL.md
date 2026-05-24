---
name: openspec-apply-change
description: "Implement OpenSpec change tasks. Pre-apply review gate, feature branch, .opsx-state.json updates."
license: MIT
compatibility: Requires openspec CLI, Node 22+, scripts/opsx/state.mjs, review-report template.
metadata:
  author: a-couple-apps
  version: '2.0'
  generatedBy: '1.2.0'
---

Implement tasks from an OpenSpec change. Before any code change, this skill enforces a pre-apply review gate so artifacts are validated before implementation starts.

See `.claude/skills/sdd-workflow/SKILL.md` `## /opsx:apply Rules` for a-couple-apps-specific policies (branch naming, state file contract, pre-apply review gate semantics). This skill implements the generic flow that satisfies those rules.

## Flow

1. **Select the change** — infer from context or prompt via `AskUserQuestion`. Never auto-pick when ambiguous.

2. **Check status + load state**:

   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   node scripts/opsx/state.mjs read "openspec/changes/<name>"
   ```

   Parse `schemaName`, `contextFiles`, and the task list. Read `.opsx-state.json` for `reviewedAt`, `reviewWaived`, `appliedAt`. Handle `blocked` / `all_done` states by suggesting the appropriate next command.

   **Missing state file** (legacy change): initialize it via `node scripts/opsx/state.mjs init "openspec/changes/<name>" "<name>"` with `reviewedAt: null`, `reviewWaived: false` so the gate runs.

3. **Enforce the pre-apply review gate**

   Read `openspec/project.md` `verify.archive.require_review_before_apply` via `node scripts/opsx/project-config.mjs get verify.archive.require_review_before_apply`. If `false`, skip to step 4.

   Otherwise:

   - `reviewedAt` set → gate satisfied.
   - `reviewWaived === true` with `reviewWaiveReason` → gate waived, log it, skip.
   - Otherwise → auto-invoke `/osx:review` using the `Skill` tool (`osx-review-artifacts`), copy `openspec/templates/review-report.md` to the change dir, fill it, and lint via `pnpm opsx:review-report:lint openspec/changes/<name>/review-report.md`. Patch state:

     ```bash
     node scripts/opsx/state.mjs set "openspec/changes/<name>" '{ "reviewedAt": "<ISO-8601>" }'
     ```

   **CRITICAL review findings block apply**: if the report has any CRITICAL entries, refuse to proceed, surface them, suggest `/osx:modify <name>`, and do NOT create a branch or mark tasks.

4. **Create the feature branch** (only on first-time apply — `appliedAt === null` AND current branch is `main`):

   ```bash
   git fetch origin
   git checkout -b "feat/<change-name>" --no-track origin/main
   ```

   Do not set upstream — archive does that at push time.

5. **Read context files and show progress**

   Read every file listed in `contextFiles` from the apply instructions. Display schema, `N/M` progress, remaining tasks, and the dynamic CLI instruction.

6. **Implement tasks (loop until done or blocked)**

   - Announce the current task, make the minimum change, mark `- [ ]` → `- [x]` immediately.
   - On the first `[x]` flip this session (when `appliedAt` is null), patch state:

     ```bash
     node scripts/opsx/state.mjs set "openspec/changes/<name>" '{ "appliedAt": "<ISO-8601>" }'
     ```

     Never overwrite an existing non-null `appliedAt`.

   Pause on: unclear tasks → ask; design issue revealed → suggest artifact update; errors or unexpected state → surface; user interrupts.

7. **Intermediate push** (recommended on clean milestones):

   ```bash
   git push -u origin HEAD
   ```

   Never create a PR — that belongs to `/opsx:archive`.

8. **On completion or pause, show status**

   `Completed this session` + overall `N/M`. If `N == M`, suggest `/opsx:verify <name>`. If paused, explain the blocker.

## Output Templates

**Completion**:

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** N/N tasks complete ✓

Run /opsx:verify <name> next.
```

**Review gate block**:

```
## Apply Blocked — Pre-Apply Review Gate

**Review status:** BLOCKED with N CRITICAL findings
### CRITICAL findings
- ...

Run /osx:modify <name> to address and re-run /opsx:apply.
```

**Pause**:

```
## Implementation Paused

**Progress:** K/N tasks complete

### Issue
<description>

**Options:**
1. <option 1>
2. <option 2>
```

## Guardrails

- Always load `.opsx-state.json` before touching code.
- Always enforce the review gate unless `reviewWaived: true` with a reason.
- Never skip `/osx:review` on an unreviewed change.
- Never create a PR inside apply (archive owns PR creation).
- Always patch `appliedAt` on the first `[x]` flip (once per change).
- Keep edits minimal, scoped to each task.
- Pause on errors, blockers, or unclear requirements.

## Fluid Workflow Integration

Re-enterable: interleave with `/opsx:verify`, pause mid-task, mid-apply artifact updates via `/osx:modify` when implementation reveals a design issue. Not phase-locked.
