---
name: sdd-workflow
description: "A Couple Apps OpenSpec SDD overrides. INVOKE PROACTIVELY for /opsx:apply, /opsx:verify, /opsx:archive. Covers branch naming, verify-report.md/.opsx-state.json lifecycle, archive-to-PR pipeline, deferred-issues, manual-actions."
user-invocable: false
---

# SDD Workflow — A Couple Apps Overrides

Project-specific rules layered on top of generic OpenSpec skills. Every change
in this repo carries two durable per-change artifacts:

- `openspec/changes/<name>/verify-report.md` — schema-driven report written by
  `/opsx:verify`, consumed by `/opsx:archive`. See
  `openspec/templates/verify-report.md` for the canonical template.
- `openspec/changes/<name>/.opsx-state.json` — lifecycle state file updated
  by every `/opsx:*` command. Schema at `openspec/schemas/opsx-state.schema.json`.
  Helpers at `scripts/opsx/state.mjs`.

Thresholds and triage rules live in `openspec/project.md`
(`verify.thresholds.*`, `verify.triage.*`, `verify.archive.*`). Do NOT hard-code
those values in commands/skills — always read them at runtime.

## `/opsx:propose` Rules

- Initialize `.opsx-state.json` with `schemaVersion: 1`, `changeName`,
  `createdAt`, `proposedAt` on successful scaffold. Use
  `node scripts/opsx/state.mjs init openspec/changes/<name> <name>`.

## `/opsx:apply` Rules

- `git fetch origin` first.
- Branch from `origin/main` **no tracking**:
  `git checkout -b feat/<change-name> --no-track origin/main`.
- Upstream set by `/opsx:archive` via `git push -u origin <branch-name>`.
- **Intermediate push**: `git push -u origin HEAD` at any clean milestone.
- **Pre-apply review gate**: before touching any implementation task, read
  `.opsx-state.json`. If `reviewedAt` is null AND `reviewWaived` is false,
  auto-invoke `/osx:review` on the change, persist the review output to
  `openspec/changes/<name>/review-report.md`, and update
  `.opsx-state.json.reviewedAt` on success. If the review produces any
  CRITICAL findings, refuse to proceed and suggest `/osx:modify` to address
  them. The gate is controlled by `verify.archive.require_review_before_apply`
  in `openspec/project.md`.
- When the first task flips from `[ ]` to `[x]`, update
  `.opsx-state.json.appliedAt` to the current ISO-8601 timestamp.

## `/opsx:verify` Rules

- **Report is the source of truth.** Every finding, fix, defer, manual action,
  and spec drift lives in `verify-report.md`. The chat output is a one-line
  pointer to the file. Never dump the report in chat.
- **Triage is automatic and bounded.** The triage loop runs up to
  `verify.triage.max_iterations` (default 3). Stop criteria: `CRITICAL == 0`
  AND deferred ID set stable across two iterations. After max iterations with
  CRITICAL still present → `BLOCKED`; with oscillating deferred set →
  `BLOCKED_LOOP` (add diagnostic section naming the oscillating IDs).
- **Auto-fix is rule-based**, not LLM discretion. See
  `openspec/project.md` `verify.triage.rules` for the canonical list.
  Max total LoC per iteration: `verify.triage.auto_fix_max_loc_per_change`
  (default 150).
- **Deferred work becomes ready-to-run `/opsx:propose` commands** in the
  report's `## Deferred Work` section. At archive time each entry becomes a
  GitHub issue and the PR body links to the issue URL (not the raw command).
- **Manual actions reference library recipes by ID** when possible. See
  `openspec/manual-checks/*.md`. Inline steps only when no recipe matches,
  with a TODO note to extract a new recipe on recurrence.
- **Spec drift is resolved inline**: when verify detects that the delta spec
  is outdated but the code is correct, update the delta spec and append the
  fix to `## Spec Drift Resolutions`.
- **Schema lint the report** (`node scripts/opsx/verify-report-lint.mjs <path>`) before
  finishing. Malformed report → abort with non-zero exit.
- **Tasks.md authoring lint** runs for every change. Invoke
  `node scripts/opsx/lint-tasks-md.mjs openspec/changes/<name>` and fold
  each per-finding stdout line (`<dir>/tasks.md:<line>: tasks_md_authoring_lint:<rule>: <message>`)
  into the report's Findings list as one entry per line, with
  `Kind: tasks_md_authoring_lint`, `Dimension: coherence` for the
  `plain_bullets` / `numbered_heading` rules (formatting concern) or
  `Dimension: correctness` for the `order_drift` / `pairing_failed` rules
  (semantic-pair concern), and `Auto-fix eligible: no` for all four rules
  (codifies Requirement `TasksMdAuthoringLintEnforces` and enforces parent
  Requirements `TaskListOutOfScopeUsesPlainBullets` and
  `OutOfScopeMirrorsNonGoalsOrder`). The lint exits 0 on archive-pathed
  change-dirs (`enforce-archived-design-edit-lint` remains the
  authoritative archive gate); a non-zero exit does NOT abort verify —
  verify continues, folds the findings into its report, and the
  scorecard reflects them like any other coherence/correctness finding.
- **Update `.opsx-state.json`** with `verifiedAt`, `verifyStatus`,
  `verifyIterations`, `lastVerifyReportPath` in non-dry-run mode.
- **PR comment mode**: if `.opsx-state.json.prUrl` is set and we are not in
  `--since` diff mode, post a finding-ID delta comment to the PR via
  `gh pr comment`.
- **Diff mode**: `/opsx:verify --since <ref>` writes `verify-report.diff.md`,
  does not touch `verify-report.md`, and does not update state.
- **Dry run mode**: `/opsx:verify --no-fix` writes the report with
  `Dry Run: true`, skips triage, does not mutate state or other files.

### Post-Verify Triage (reference — executed inline during the loop)

The triage loop handles all four classes in one pass. This list documents
the priorities so that the agent knows what ends up where.

1. **CRITICAL** — Must be fixed for `READY`. Rule-based auto-fix when eligible
   (`incomplete_task_with_evidence`, `missing_implementation_single_file_small`),
   otherwise `BLOCKED`.
2. **WARNING** — Rule-based auto-fix when eligible
   (`spec_divergence_code_correct`, `scenario_uncovered_test_file_exists`),
   otherwise deferred.
3. **SUGGESTION** — Rule-based auto-fix when eligible
   (`pattern_deviation_single_line`, `missing_why_comment_small_scope`),
   otherwise deferred.
4. **Deferred** — Each entry gets a ready-to-run `/opsx:propose` command in
   the report; at archive time each becomes a GitHub issue.
5. **Spec drift** — Delta spec updated, `## Spec Drift Resolutions` entry.
6. **Manual actions** — Captured in `## Manual Actions Required`, referencing
   library recipes by ID.

The agent never asks the user "want me to commit?" or "ready to archive?" in
the middle of the verify loop. Status is written to the report, surfaced as a
one-line chat summary, and the user triggers `/opsx:archive` when ready.

## `/opsx:archive` Rules

1. **Read `verify-report.md`** via `node scripts/opsx/verify-report-parser.mjs`.
   Missing report → treat as empty (all sections `_None_`), add
   `opsx:unverified` label to the PR, proceed. If `verify.thresholds.block_on_missing_report`
   is true, refuse to proceed until a report exists.
2. **Check scorecard thresholds** from `openspec/project.md`. If any threshold
   is breached, use `AskUserQuestion` with options `Abort`, `Override this
   run`, `Update thresholds in project.md`. On override, log the override to
   `.opsx-state.json.thresholdOverrides` (future field — for now, add to
   commit message).
3. **Run `code-reviewer` agent** on the full diff (`git diff main...HEAD`).
   Fix CRITICAL/WARNING issues before proceeding. Mandatory, never skipped.
4. **Commit all changes** using conventional format. Group orphaned deletions
   into a separate commit. Never proceed to push with a dirty tree.
5. **Rebase + push**: `git fetch origin && git rebase origin/main && git push -u origin HEAD`.
   **Verify tracking**: `git config --get branch.$(git branch --show-current).remote`
   — if empty, fix with `git branch --set-upstream-to=origin/<branch>`.
6. **Compose PR body mechanically** from `.github/PULL_REQUEST_TEMPLATE.md`
   + parsed `verify-report.md`. Draft the test plan checklist, run every
   automated item, mark `[x]` only after confirming it passes. Never create
   a PR with unchecked boxes on the automated checklist.
   - **Issue auto-close**: scan `proposal.md` (full file) for GitHub issue
     references matching `/(?:closes?|fixes?|resolves?)\s+#(\d+)/i` (already
     closing-keyword), `/(?:github\s+issue|issue)\s+#?(\d+)/i`, or bare
     `(#\d+)` inside the `## Why` / `## Impact` sections. Dedupe the
     numbers. Prepend a `Closes #<n>` line per issue at the very top of the
     PR body (above `## Summary`) so GitHub auto-closes them on merge.
     `.opsx-state.json.closesIssues` (array of numbers), if present, is the
     canonical override — use it verbatim and skip the regex scan. Skip
     numbers that are already prefixed by a closing keyword in the assembled
     body to avoid duplicate `Closes #N` lines.
7. **`gh pr create`** with the assembled body.
8. **Create GitHub issues for deferred work** (controlled by
   `verify.archive.create_deferred_issues`). For each entry in
   `## Deferred Work`, run `gh issue create` with labels `opsx:deferred` and
   `opsx:follow-up:<origin-change>`. Record `{id, number, url, findingId}`
   into `.opsx-state.json.deferredIssues`. Replace the raw `/opsx:propose`
   block in the PR body with the issue URL. If deferred count is
   `>= verify.archive.deferred_issue_batch_prompt_threshold` (default 5),
   prompt for confirmation via `AskUserQuestion` before batch creation.
9. **Apply conditional labels**:
   - `opsx:follow-up` (`5319E7`, purple) if `## Deferred Work` is non-empty.
   - `needs:manual-qa` (`D93F0B`, red) if `## Manual Actions Required` is
     non-empty.
   - `opsx:unverified` (`FBCA04`, yellow) if no `verify-report.md` exists.
   - Create labels idempotently via `gh label create ... 2>/dev/null || true`.
10. **Apply CI labels** from `.openspec.yaml` `ciLabels` array. Backward compat:
    if `ciLabels` is absent but `ciProfile: extended` is set, treat as
    `[ci:mutation, ci:bundle]`.
11. **Create GitHub issues for manual actions**: for each
    `## Manual Actions Required` entry, run `gh issue create` with labels
    `opsx:manual-action`, `opsx:manual-action:<origin-change>`, and
    `needs:manual-qa`. Issue body references the library recipe by ID when
    one applies, inline steps otherwise, plus the pass criteria from the
    report. The PR body's `## Manual QA Checklist` lists each as
    `- [ ] #<n> <title> — <url>`. Idempotent: re-archiving searches by
    per-change label + finding-id and reuses the existing issue.
12. **Move the change directory** to `openspec/changes/archive/YYYY-MM-DD-<name>/`.
    `verify-report.md`, `.opsx-state.json`, `.openspec.yaml`, `review-report.md`
    (if present) all ride along.
13. **Update `.opsx-state.json`** with `archivedAt`, `prUrl`, `prNumber`,
    `deferredIssues`, `manualActionIssues`.
14. **Run the post-archive safety check**: `node scripts/opsx/post-archive-safety-check.mjs <change-name>`.
    Relay the `SAFE TO REMOVE` / `WARN` / `BLOCKED` verdict in the final summary.
    Exit `0` = worktree is safe to remove. Exit `1` = archive completed but
    something is still not clean — surface the specific blocker(s).
    **Never emit `git worktree remove` / `git branch -D` commands** — the
    worktree is auto-removed when the user leaves the conversation.
    Never auto-remove the worktree either.
15. **Return PR URL** as the final output. No prompts between steps 3 and 15.

- **Skill tool ban**: Never invoke the Skill tool for sub-operations during `/opsx:archive` or `/opsx:verify`. Use the Agent tool (`subagent_type`) or inline the work. The Skill tool ends the conversation turn and breaks multi-step pipelines.

## Pre-PR Gate

- `git status` → clean tree. Uncommitted → commit first. Never PR with a
  dirty tree.

## State File Contract

Every `/opsx:*` command updates specific fields in `.opsx-state.json`. Never
write other fields than the ones owned by your command, to avoid collisions:

| Command            | Fields written                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/opsx:propose`    | `schemaVersion`, `changeName`, `createdAt`, `proposedAt`                                                                                       |
| `/opsx:apply`      | `appliedAt`, `reviewedAt` (via auto-`/osx:review`), `reviewWaived` + `reviewWaiveReason` (if user explicitly waives)                           |
| `/osx:review`      | `reviewedAt`                                                                                                                                   |
| `/opsx:verify`     | `verifiedAt`, `verifyStatus`, `verifyIterations`, `lastVerifyReportPath`                                                                       |
| `/opsx:archive`    | `archivedAt`, `prUrl`, `prNumber`, `deferredIssues`, `manualActionIssues`                                                                      |
| `/osx:backfill-verify` | `verifyStatus: RECONSTRUCTED`, `lastVerifyReportPath` (sets `verifiedAt` to the archive date if not already set)                            |

Corrupt state file → surface diagnostic, offer rebuild via `AskUserQuestion`,
derive from filesystem (archive dir existence, branch existence, file mtimes).
Never silently regenerate.

## Labels Registry

| Label             | Color    | Applied when                                                 | Purpose                                      |
| ----------------- | -------- | ------------------------------------------------------------ | -------------------------------------------- |
| `opsx:follow-up`  | `5319E7` | `## Deferred Work` non-empty in report                       | Informational: PR has follow-up backlog      |
| `needs:manual-qa` | `D93F0B` | `## Manual Actions Required` non-empty in report             | Gate: reviewer must confirm manual checks    |
| `opsx:unverified` | `FBCA04` | No `verify-report.md` in the change (legacy / skipped)       | Informational: PR bypassed `/opsx:verify`     |
| `opsx:deferred`      | `5319E7` | On every GitHub issue created from Deferred Work             | Backlog tag on spawned issues             |
| `opsx:manual-action` | `D93F0B` | On every GitHub issue created from Manual Actions Required   | Tag on manual-action issues               |
| `ci:*`               | —        | From `.openspec.yaml` `ciLabels` (or `ciProfile: extended`)  | CI gate triggers                          |

The full `ci:*` table lives in the `openspec-archive-change` skill.
