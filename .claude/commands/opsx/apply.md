---
name: 'OPSX: Apply'
description: Implement tasks from an OpenSpec change. Enforces the pre-apply review gate, creates the feature branch, marks tasks complete, and updates .opsx-state.json.
category: Workflow
tags: [workflow, artifacts, experimental]
---

Implement tasks from an OpenSpec change. Before touching any code, the command enforces the pre-apply review gate (auto-invoking `/osx:review` on unreviewed changes) so artifacts are known-good before implementation starts.

**Input**: Optionally specify a change name (e.g., `/opsx:apply add-auth`). Infer from context if omitted; prompt via `AskUserQuestion` if ambiguous.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if exactly one active change exists
   - If ambiguous, run `openspec list --json` and use **AskUserQuestion** to let the user choose

   Always announce: "Using change: <name>".

2. **Check status + load state**

   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   node scripts/opsx/state.mjs read "openspec/changes/<name>"
   ```

   Parse the CLI outputs for `schemaName`, `contextFiles`, and the task list. Read `.opsx-state.json` for `reviewedAt`, `reviewWaived`, `appliedAt`.

   Handle states:
   - `state: "blocked"` (missing artifacts) → suggest `/opsx:continue`, stop.
   - `state: "all_done"` → congratulate, suggest `/opsx:verify` + `/opsx:archive`, stop.
   - Otherwise → proceed to the review gate.

   **Missing `.opsx-state.json`** (legacy change): initialize one via `node scripts/opsx/state.mjs init openspec/changes/<name> <name>` and continue. Leave `reviewedAt: null`, `reviewWaived: false` so the review gate runs.

3. **Enforce the pre-apply review gate**

   Read `openspec/project.md` `verify.archive.require_review_before_apply` via `node scripts/opsx/project-config.mjs get verify.archive.require_review_before_apply`. If `false`, skip to step 4.

   **Gate logic**:

   - If `.opsx-state.json.reviewedAt` is a non-null ISO timestamp → gate satisfied, skip to step 4.
   - If `.opsx-state.json.reviewWaived === true` with `reviewWaiveReason` set → gate waived, log `"Pre-apply review waived: <reason>"` in chat and skip to step 4.
   - Otherwise → **auto-invoke `/osx:review`** on the change artifacts:

     1. Use the `Skill` tool with `osx-review-artifacts` (or `osx:review`), passing the change name.
     2. Copy `openspec/templates/review-report.md` to `openspec/changes/<name>/review-report.md` if missing.
     3. Fill the report with the review output (Scorecard, Artifact Findings by severity, Fixes Applied During Review, Deferred Artifact Work, Readiness, Next Step).
     4. Run `node scripts/opsx/review-report-lint.mjs openspec/changes/<name>/review-report.md`. Abort on lint failure with the diagnostic.
     5. Patch state:
        ```bash
        node scripts/opsx/state.mjs set "openspec/changes/<name>" '{ "reviewedAt": "<ISO-8601 now>" }'
        ```

   **Blocking on CRITICAL review findings**: if the resulting `review-report.md` has one or more CRITICAL entries under `## Artifact Findings`, refuse to proceed, print the findings, and suggest `/osx:modify <name>` to address them. Do NOT mark tasks complete, do NOT create a branch.

4. **Create the feature branch** (only on first-time apply — detect by `.opsx-state.json.appliedAt === null` AND current branch is `main`)

   ```bash
   git fetch origin
   git checkout -b "feat/<change-name>" --no-track origin/main
   ```

   Upstream is NOT set here — `/opsx:archive` sets it via `git push -u origin <branch>` at archive time.

5. **Read context files and show progress**

   Read every file in `contextFiles` from the apply instructions. Display:
   - Schema
   - Progress: `N/M tasks complete`
   - Remaining task titles
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Announce which task is next
   - Make the minimum code change the task calls for
   - Mark `- [ ]` → `- [x]` in `tasks.md` immediately after the edits land
   - Continue

   **On the first `[x]` flip in this session**, patch state:

   ```bash
   node scripts/opsx/state.mjs set "openspec/changes/<name>" '{ "appliedAt": "<ISO-8601 now>" }'
   ```

   Only do this if `appliedAt` is currently null (don't overwrite a real timestamp from a prior session).

   **Pause if**:
   - Task wording is unclear → ask for clarification.
   - Implementation reveals a design issue → suggest updating artifacts.
   - Any error or unexpected state → report and wait for guidance.
   - User interrupts.

7. **Commit and push — mandatory on completion, skip on pause**

   When the last task flips to `[x]` (all 44/44 complete or however the total lands) AND the working tree is in a clean, runnable state, the apply flow MUST commit and push. Do not ask the user — this is the default, the user can revert if they disagree. Only skip on pause (blocker, unclear requirement, user interrupt).

   Sequence:

   1. **Run `git status` + `git diff` via the Bash tool** to see the full set of changes.
   2. **Run the code-reviewer subagent on the full diff** (per project CLAUDE.md and user feedback-memory "Code reviewer mandatory"). Surface findings in chat.
      - If reviewer returns CRITICAL or HIGH: address inline, then re-run reviewer on the updated diff.
      - MEDIUM / LOW: include in commit body or defer to verify-report — do NOT block the commit for them.
   3. **Stage files explicitly by path** (never `git add -A` / `git add .` — per user feedback-memory "Clean tree before PR"). Include the change-directory edits (tasks.md, review-report.md, `.opsx-state.json`), all source/manifest/workflow/docs edits, and any ancillary files touched (e.g., ADR index updates, manual-check recipes, lint script updates).
   4. **Compose a Conventional Commit** (per repo convention: `type(scope): description`). Subject ≤72 chars; body explains the *why* and lists the headline moves. Scope comes from the `p<N>-<name>` OpenSpec change or the dominant package. Do NOT include Claude attribution (per user feedback-memory "No Claude attribution").
   5. **`git commit`** via the Bash tool with the HEREDOC form so multi-line bodies render correctly.
   6. **`git push -u origin HEAD`** (per user feedback-memory "Git push upstream" — always `-u origin HEAD`, never bare `git push`). If pre-push hooks fix files, inspect the new diff and amend or add a follow-up commit — never use `--no-verify`.

   Never create a PR in this step — `/opsx:archive` owns PR creation.

   **Pause path (blocker, unclear requirement, user interrupt)**: do NOT auto-commit/push. Explain the blocker in the chat output and let the user decide whether to commit partial work.

8. **On completion or pause, show status**

   Display tasks completed this session + overall `N/M`, plus the commit SHA + pushed branch if step 7 ran. If all done, suggest `/opsx:verify <name>`. If paused, explain the blocker and note that no commit was created.

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** N/N tasks complete ✓

All tasks complete. Run /opsx:verify <name> next.
```

**Output On Review Gate Block**

```
## Apply Blocked — Pre-Apply Review Gate

**Change:** <change-name>
**Review status:** BLOCKED with N CRITICAL findings

### CRITICAL findings
- ...

Run /osx:modify <change-name> to address the findings, then re-run /opsx:apply.
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** K/N tasks complete

### Issue
<description>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach
```

**Guardrails**

- Always load `.opsx-state.json` before touching any implementation.
- Always enforce the pre-apply review gate unless `reviewWaived` is explicitly true with a reason.
- Never skip `/osx:review` — that's the gate's purpose.
- Never create a PR inside apply — archive owns PR creation.
- Always patch `appliedAt` on the first `[x]` flip per change (once, never again).
- Keep edits minimal and scoped to each task.
- Pause on errors, blockers, or unclear requirements.
- Always commit + push when the task list completes cleanly (step 7). Never leave uncommitted changes behind when apply finishes successfully. Skip commit+push only on a genuine pause.
- Always run the code-reviewer subagent on the full diff before committing. Never skip the reviewer.
- Always stage files explicitly (`git add <path>...`), never `git add -A` / `git add .`.
- Always `git push -u origin HEAD` — never bare `git push`.
- Never `--no-verify`, never `--amend` after a failing hook — fix the issue and create a new commit.
- Never include Claude attribution ("Generated with Claude Code", etc.) in commits or artifacts.

**Fluid Workflow Integration**

This command supports "actions on a change": it can re-enter an in-progress change, interleave with `/opsx:verify`, or pause mid-task. Artifacts can be updated mid-apply via `/osx:modify` if implementation reveals a design issue.
