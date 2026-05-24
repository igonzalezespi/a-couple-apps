---
name: openspec-verify-change
description: "Verify implementation vs artifacts → verify-report.md, auto-fix or defer findings."
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: '2.0'
  generatedBy: '1.2.0'
---

Verify that an implementation matches the change artifacts (specs, tasks, design) and persist every finding to a durable, PR-embeddable report.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Flags**

- `--no-fix` — dry-run mode. Write the report but do not apply any triage fixes, do not mutate `.opsx-state.json`, and mark the report header `Dry Run: true`.
- `--since <git-ref>` — diff mode. Verify only the files/specs touched since the ref and write `verify-report.diff.md` instead of `verify-report.md`.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` and use the **AskUserQuestion tool**. Show changes that have implementation tasks (tasks artifact exists). Mark incomplete changes as `(In Progress)`. Never guess.

2. **Load schema and change state**

   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   ```

   Read files from `contextFiles`. Read `.opsx-state.json` via `node scripts/opsx/state.mjs read openspec/changes/<name>`. If missing, initialize it (see Legacy Changes).

3. **Initialize the verify report file**

   Target: `openspec/changes/<name>/verify-report.md` (or `verify-report.diff.md` in diff mode).

   If the file does not exist, copy `openspec/templates/verify-report.md` as the starting point and fill in the H1 title + header fields (Change, Verified, Status, Schema, Iterations=0, Dry Run=<flag>).

   If the file exists, read it, preserve prior finding IDs, and prepare to update it in place.

4. **Run the triage loop (skipped in `--no-fix` mode)**

   Body: verify → collect findings → auto-fix eligible → update report → re-verify. Maximum 3 iterations. Stop early when `CRITICAL == 0` AND the deferred finding ID set is stable across two consecutive iterations.

5. **Verify Completeness**

   **Task completion**: parse `tasks.md` checkboxes. Incomplete task + evidence of implementation → CRITICAL `incomplete_task` (auto-fixable). Incomplete + no evidence → CRITICAL, not auto-fixable.

   **Spec coverage**: for each `### Requirement:` in delta specs, search the codebase for implementation evidence. Missing → CRITICAL `missing_requirement_implementation` (auto-fixable only if scope ≤150 LoC single file).

6. **Verify Correctness**

   **Requirement→code mapping**: identify implementing code with file paths and line ranges. Divergence → WARNING `spec_divergence` (auto-fixable via delta spec update when code is correct).

   **Scenario coverage**: for each `#### Scenario:`, check if tests cover it. Uncovered + existing test file → WARNING `scenario_uncovered` (auto-fixable). Uncovered + no test file → WARNING, not auto-fixable.

7. **Verify Coherence**

   **Design adherence**: if `design.md` exists, extract decisions and verify code follows them. Violations → WARNING `design_drift`.

   **Pattern consistency**: review new code vs project patterns. Deviations → SUGGESTION `pattern_deviation` (auto-fixable only when single-line or lint-fixable).

   **Missing-why comments**: non-obvious intent without `// reason: …` → SUGGESTION `missing_comment_why` (auto-fixable when scope ≤5 lines).

8. **Embed test compliance**

   Invoke `osx-review-test-compliance` logic internally. Produce `## Test Compliance` section: summary line, per-scenario table, orphan list, gap list. If no tests exist, use the literal fallback `_No test files found for this change. Coverage analysis skipped._`

9. **Apply auto-fixes (rule-based)**

   For each finding, evaluate eligibility rules from `openspec/project.md` `verify.triage.rules`:

   - `critical_incomplete_task_with_evidence` — mark checkbox `[x]` if evidence exists.
   - `critical_missing_implementation_single_file_small` — implement minimally when single file ≤150 LoC.
   - `warning_spec_divergence_code_correct` — update delta spec + append `## Spec Drift Resolutions` entry.
   - `warning_scenario_uncovered_test_file_exists` — add one test case.
   - `suggestion_pattern_deviation_single_line` — apply single-line or lint-fixable change.
   - `suggestion_missing_why_comment_small_scope` — add concise `// reason: …` for scope ≤5 lines.

   Total LoC across auto-fixes in one iteration must not exceed `verify.triage.auto_fix_max_loc_per_change` (default 150).

   For every fix: append to `## Fixes Applied During Verify` with (finding-id, dimension/kind, problem, fix, files touched, verified-by, iteration).

   For every non-eligible finding: leave in `## Findings`, queue for Deferred Work.

10. **Write deferred work as ready-to-run `/opsx:propose` commands**

    For each non-CRITICAL non-eligible finding, write a `## Deferred Work` entry with: title, origin, finding ID, why deferred, affected files, fenced `/opsx:propose <kebab>` command + 1–3 sentence description. Sort by finding ID ascending for stability.

11. **Collect manual actions**

    For every agent-unverifiable item, write a `## Manual Actions Required` entry: title, category, finding ID, why, **recipe reference by ID when available**, optional context, pass criteria, owner=human. Never silently omit.

12. **Fill the Scorecard section**

    Compute values: tasks X/Y, requirements covered N/M, scenarios covered K/L, requirements mapped N/M, design followed Y/N/partial, patterns aligned/issues. Populate the table with threshold values from `openspec/project.md`.

13. **Generate finding IDs**

    Each finding gets an 8-char hex ID = first 8 chars of `sha256({dimension}|{kind}|{location}|{title})`. Stable across iterations → enables stability check.

14. **Triage-loop stability check**

    Compute `critical_count` and `deferred_ids` (sorted). End conditions:

    - `critical_count == 0` AND `deferred_ids == deferred_ids_last` → stop, status `READY` or `READY_WITH_WARNINGS`.
    - `iteration_count < max_iterations` → loop.
    - `max_iterations` reached + `critical_count > 0` → stop, status `BLOCKED`.
    - `max_iterations` reached + oscillating deferred set → stop, status `BLOCKED_LOOP`, add diagnostic section naming oscillating IDs.

15. **Schema-lint the report**

    Run `node scripts/opsx/verify-report-lint.mjs <path>` on the report file. Fail non-zero on schema deviation.

16. **Update `.opsx-state.json`** (skipped in `--no-fix`)

    ```bash
    node scripts/opsx/state.mjs set openspec/changes/<name> '{
      "verifiedAt": "<ISO-8601>",
      "verifyStatus": "<status>",
      "verifyIterations": <N>,
      "lastVerifyReportPath": "verify-report.md"
    }'
    ```

17. **PR comment mode** (when `.opsx-state.json.prUrl` is set, not in diff mode)

    Compute diff between HEAD's previous `verify-report.md` and the new version. Produce a finding-ID delta comment (added / resolved / status-changed). Post via `gh pr comment "$PR_URL" --body @-`. Link to full report if body exceeds size limits.

18. **Diff mode** (when `--since <ref>` is provided)

    Restrict scope to files changed since `<ref>` via `git diff --name-only <ref> HEAD`. Write to `verify-report.diff.md`, add `## Diff` block with ref + scope. Do not update state file. Abort on invalid ref.

19. **Produce chat summary**

    ONE short status line pointing at the file. Examples:

    - `Verify READY. 0 findings. Report: openspec/changes/<name>/verify-report.md. Run /opsx:archive.`
    - `Verify READY_WITH_WARNINGS. Iter 2. 0 CRITICAL, 3 deferred, 1 manual action. Run /opsx:archive when manual checks acknowledged.`
    - `Verify BLOCKED. Iter 3. 1 CRITICAL (id: a1b2c3d4) unfixable (cross-file refactor). Resolve manually, re-run.`

    Never dump the full report in chat.

**Auto-fix Eligibility Reference**

Rule set in `openspec/project.md` `verify.triage.rules`. Short form:

| Kind                              | Severity   | Eligible when                                         |
| --------------------------------- | ---------- | ----------------------------------------------------- |
| `incomplete_task`                 | CRITICAL   | Evidence of completion exists → mark checkbox         |
| `missing_requirement_implementation` | CRITICAL | Single file ≤150 LoC change                          |
| `spec_divergence`                 | WARNING    | Code correct, spec outdated → update delta spec        |
| `scenario_uncovered`              | WARNING    | Test file exists → add a test case                    |
| `pattern_deviation`               | SUGGESTION | Single-line or lint-fixable                          |
| `missing_comment_why`             | SUGGESTION | Scope ≤5 lines                                        |

Everything else defers.

**Legacy Changes**

- `.opsx-state.json` missing → create on this invocation. Infer `createdAt` from dir mtime, `proposedAt = createdAt`, `appliedAt = createdAt` if any task is `[x]`, `reviewedAt = null`, `reviewWaived = false`.
- `verify-report.md` missing → copy template, run verify normally.

**Output Format**

Report follows `openspec/templates/verify-report.md` exactly. Chat summary is ≤3 lines. Never inline the report in chat.

**Guardrails**

- Prompt for change selection if not provided.
- Always copy the template on first run.
- Always run the schema linter before finishing.
- Never silently omit manual actions.
- Never apply auto-fixes outside the rule set.
- Never exceed per-iteration LoC budget.
- Never skip state update in non-dry-run mode.
- Never write the diff-mode report to `verify-report.md`.
- Never ask for confirmation between steps.
