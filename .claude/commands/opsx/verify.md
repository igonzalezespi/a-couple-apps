---
name: 'OPSX: Verify'
description: Verify implementation matches change artifacts, persist findings to verify-report.md, auto-fix eligible findings, defer the rest, and update lifecycle state
category: Workflow
tags: [workflow, verify, experimental]
---

Verify that an implementation matches the change artifacts (specs, tasks, design) and persist every finding to a durable, PR-embeddable report.

**Input**: Optionally specify a change name after `/opsx:verify` (e.g., `/opsx:verify add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Flags**

- `--no-fix` — dry-run mode. Write the report but do not apply any triage fixes, do not mutate `.opsx-state.json`, and mark the report header `Dry Run: true`.
- `--since <git-ref>` — diff mode. Verify only the files/specs touched since the ref and write `verify-report.diff.md` instead of `verify-report.md`. Does not overwrite the main report.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise prompt for selection using the **AskUserQuestion tool** after running `openspec list --json`. Show changes that have implementation tasks (tasks artifact exists). Mark changes with incomplete tasks as `(In Progress)`. Never guess or auto-select.

2. **Load schema and change state**

   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   ```

   Parse JSON to understand `schemaName`, the `contextFiles` array, and the artifact graph. Read all files listed in `contextFiles`.

   Read `.opsx-state.json` from the change directory via `node scripts/opsx/state.mjs read openspec/changes/<name>`. If the file does not exist (legacy change), initialize it with inferred fields (see Legacy Changes below).

3. **Initialize the verify report file**

   Target path: `openspec/changes/<name>/verify-report.md` (or `verify-report.diff.md` in diff mode).

   If the file does not exist, copy `openspec/templates/verify-report.md` as the starting point and fill in the H1 title with the change name plus header fields (Change, Verified, Status, Schema, Iterations=0, Dry Run=<flag>).

   If the file exists, read it, preserve prior finding IDs for stability tracking, and prepare to update it in place.

4. **Run the triage loop** (skipped in `--no-fix` mode)

   The loop body is: verify → collect findings → auto-fix eligible → update report → re-verify. Maximum 3 iterations. Stop early when `CRITICAL == 0` AND the deferred finding ID set is stable across two consecutive iterations.

   Each iteration performs steps 5–8 below, then decides whether to loop again per the stability check.

5. **Verify Completeness**

   - **Task completion**: parse `tasks.md` checkboxes (`- [ ]` vs `- [x]`). Incomplete tasks with code evidence of implementation → add CRITICAL finding `kind: incomplete_task` (auto-fixable if evidence found). Incomplete tasks with no evidence → add CRITICAL, not auto-fixable.
   - **Spec coverage**: for each requirement in delta specs (marked `### Requirement:`), search the codebase for implementation evidence. Missing implementation → add CRITICAL finding `kind: missing_requirement_implementation` (auto-fixable only if scope ≤150 LoC single file).

6. **Verify Correctness**

   - **Requirement→code mapping**: for each requirement, identify the implementing code with file paths and line ranges. Divergence from requirement intent → add WARNING finding `kind: spec_divergence`. If code is correct and spec is outdated, this is auto-fixable via delta spec update.
   - **Scenario coverage**: for each `#### Scenario:` in delta specs, check if tests cover it. Uncovered scenario with existing test file → add WARNING `kind: scenario_uncovered` (auto-fixable: add test case). Uncovered with no test file → add WARNING, not auto-fixable.

7. **Verify Coherence**

   - **Design adherence**: if `design.md` exists, extract key decisions (sections labeled `Decision:`, `Approach:`, `Architecture:`) and verify code follows them. Violations → add WARNING `kind: design_drift`.
   - **Pattern consistency**: review new code against existing project patterns (file naming, directory layout, coding style). Deviations → add SUGGESTION `kind: pattern_deviation` (auto-fixable only when single-line or lint-fixable).
   - **Missing-why comments**: spots where intent is non-obvious and lack a `// reason: …` comment → add SUGGESTION `kind: missing_comment_why` (auto-fixable only when change scope is ≤5 lines).

8. **Embed test compliance**

   Invoke the `osx-review-test-compliance` skill logic internally (you are playing the role of `/osx:verify-tests`). Extract scenarios from delta specs, discover test files, match via semantic similarity (high/medium/low confidence). Produce the `## Test Compliance` section with:
   - Summary line: `<N> scenarios extracted, <K> tests discovered, <H> high, <M> medium, <L> low, <O> orphan, <G> gaps`
   - Per-scenario table with columns `Requirement | Scenario | Coverage | Matching Test | Confidence | Notes`
   - Orphan tests list
   - Gap list with severity

   If no test files exist, write the literal fallback `_No test files found for this change. Coverage analysis skipped._` and do not affect report status.

9. **Apply auto-fixes (triage loop, rule-based)**

   For each finding produced in steps 5–7, evaluate the auto-fix eligibility rules from `openspec/project.md` `verify.triage.rules`:

   - **`critical_incomplete_task_with_evidence`** — If the finding is CRITICAL + `incomplete_task` and there is concrete code evidence that the task is done, mark the checkbox `[x]` in `tasks.md`.
   - **`critical_missing_implementation_single_file_small`** — If the finding is CRITICAL + `missing_requirement_implementation` and the required change touches a single file ≤150 LoC, implement it minimally.
   - **`warning_spec_divergence_code_correct`** — If the finding is WARNING + `spec_divergence` and the code is correct but the delta spec is stale, update the delta spec at `openspec/changes/<name>/specs/<cap>/spec.md` and append a `## Spec Drift Resolutions` entry to the report.
   - **`warning_scenario_uncovered_test_file_exists`** — If the finding is WARNING + `scenario_uncovered` and a test file for the capability already exists, add one test case covering the scenario.
   - **`suggestion_pattern_deviation_single_line`** — If the finding is SUGGESTION + `pattern_deviation` and the deviation is a single line or lint-fixable, apply the fix.
   - **`suggestion_missing_why_comment_small_scope`** — If the finding is SUGGESTION + `missing_comment_why` and the affected scope is ≤5 lines, add a concise `// reason: …` comment.

   Total LoC across all auto-fixes in a single iteration must not exceed `verify.triage.auto_fix_max_loc_per_change` from `project.md` (default 150).

   For every fix applied:
   - Append an entry to the report's `## Fixes Applied During Verify` section using the standard format (finding-id, dimension, kind, problem, fix, files touched, verified-by, iteration).
   - Run any relevant local verification (re-running the affected test, re-parsing the spec, re-linting) and include the result in the `verified by` field.

   For every finding that is NOT auto-fix-eligible:
   - Leave it in the `## Findings` sub-section (CRITICAL / WARNING / SUGGESTION).
   - Queue it for the Deferred Work step.

10. **Write deferred work as ready-to-run `/opsx:propose` commands**

    For each finding that is not auto-fix-eligible and is not CRITICAL (CRITICAL blocks archive; it cannot be deferred), generate a `## Deferred Work` entry containing:

    - Short title.
    - Origin (WARNING or SUGGESTION, dimension, kind).
    - Finding ID (8-hex hash, see step 13 below for ID generation).
    - Why deferred (`too large`, `out of scope`, `needs design`, `blocked on external`, `requires human judgment`).
    - Affected files list.
    - A fenced code block with a full ready-to-run `/opsx:propose <suggested-kebab-name>` command plus a 1–3 sentence description of what to change, why, and which files are affected. The user must be able to copy-paste-execute this block in a future session with no edits.

    Keep a stable sort order so stability checking works: sort entries by finding ID ascending.

11. **Collect manual actions**

    For every item you cannot verify autonomously (visual/UI, third-party dashboards, environment-specific behavior, secrets/credentials, human judgment, hardware), write an entry to `## Manual Actions Required`:

    - Short title.
    - Category (`visual | third-party | environment | secrets | human-judgment | hardware`).
    - Finding ID.
    - Why the agent can't verify (1–2 sentences).
    - **Prefer** referencing a manual-check recipe by ID: `**Recipe:** [<id>](../manual-checks/<id>.md)` — only inline steps if no recipe matches.
    - Optional context paragraph specific to this occurrence.
    - Pass criteria (explicit observable outcome).
    - Owner: always `human`.

    Never silently omit a manual check. If you detect it, it belongs in the report.

12. **Fill the Scorecard section**

    Compute the scorecard values:

    - Completeness: `X/Y tasks` and `N/M requirements covered`.
    - Correctness: `N/M requirements mapped` and `K/L scenarios covered by tests` (from the Test Compliance section).
    - Coherence: `Y/N/partial` design decisions followed, `aligned/issues` pattern consistency.

    Populate the scorecard table in the report. Include threshold column values from `openspec/project.md`.

13. **Generate finding IDs**

    Every finding gets a stable 8-character hex ID computed as the first 8 chars of `sha256({dimension}|{kind}|{location}|{title})`. Use `crypto.createHash` via a small inline node invocation if needed. These IDs must be stable across iterations so that the triage-loop stability check works: it compares deferred finding ID sets between iterations.

14. **Triage-loop stability check**

    After writing the updated report, compute:

    - `critical_count = count of CRITICAL findings still present in ## Findings`
    - `deferred_ids = sorted list of finding IDs in ## Deferred Work`

    Iteration end conditions:

    - If `critical_count == 0` AND `deferred_ids == deferred_ids_from_last_iteration` → stop, status `READY` if no warnings/deferred, else `READY_WITH_WARNINGS`.
    - If `iteration_count < max_iterations` (default 3) → loop (back to step 5).
    - If `iteration_count == max_iterations` AND `critical_count > 0` → stop, status `BLOCKED`.
    - If `iteration_count == max_iterations` AND `deferred_ids` oscillates → stop, status `BLOCKED_LOOP`, add diagnostic section to the report naming the oscillating IDs.

15. **Schema-lint the report**

    Before writing the final version, run `node scripts/opsx/verify-report-lint.mjs <path>` on the report file. If it fails, surface the error and abort with a non-zero status — the report is malformed and downstream tooling will break.

16. **Update `.opsx-state.json`**

    In non-dry-run mode only, patch the state file:

    ```bash
    node scripts/opsx/state.mjs set openspec/changes/<name> '{
      "verifiedAt": "<ISO-8601 now>",
      "verifyStatus": "<READY|READY_WITH_WARNINGS|BLOCKED|BLOCKED_LOOP>",
      "verifyIterations": <N>,
      "lastVerifyReportPath": "verify-report.md"
    }'
    ```

17. **PR comment mode** (only when `.opsx-state.json.prUrl` is set and not in diff mode)

    Compute the diff between the previous committed version of `verify-report.md` (retrieve via `git show HEAD:openspec/changes/<name>/verify-report.md`) and the new version. Compute the set of added, removed, and status-changed finding IDs.

    Format the comment body as:

    ```
    ## /opsx:verify update — iteration <N>, status <status>

    ### Added findings (<N>)
    - `+ CRITICAL [<id>] <title>`
    - `+ WARNING  [<id>] <title>`

    ### Resolved findings (<N>)
    - `- CRITICAL [<id>] <title>`

    ### Status changed (<N>)
    - `~ [<id>] <title>  WARNING → CRITICAL`

    [Full report](<repo-url>/blob/<branch>/openspec/changes/<name>/verify-report.md)
    ```

    If the comment body exceeds `gh pr comment` body limits, link to the full report instead of inlining. Post via:

    ```bash
    gh pr comment "$PR_URL" --body "$(cat /tmp/comment.md)"
    ```

18. **Diff mode** (when `--since <ref>` is provided)

    Restrict the verification scope to files that changed since `<ref>`:

    ```bash
    git diff --name-only <ref> HEAD -- openspec/changes/<name> <source-paths>
    ```

    Run steps 5–10 on the restricted scope only. Write the report to `verify-report.diff.md` (not `verify-report.md`). Add a `## Diff` top-level block noting the ref and scope. Do not update `.opsx-state.json` in diff mode.

    If the ref does not exist, abort immediately with a diagnostic.

19. **Produce chat summary**

    Print ONE short human-readable status line pointing at the file. Examples:

    - `Verify READY. 0 findings. Report: openspec/changes/<name>/verify-report.md. Run /opsx:archive.`
    - `Verify READY_WITH_WARNINGS. Iter 2. 0 CRITICAL, 3 deferred, 1 manual action. Report: openspec/changes/<name>/verify-report.md. Run /opsx:archive when manual actions are acknowledged.`
    - `Verify BLOCKED. Iter 3. 1 CRITICAL (id: a1b2c3d4) could not be auto-fixed (reason: cross-file refactor). Report: openspec/changes/<name>/verify-report.md. Resolve manually and re-run.`

    Do not dump the full report in chat. The file is the source of truth; chat is a pointer.

**Auto-fix Eligibility Reference**

The rule set lives in `openspec/project.md` under `verify.triage.rules`. Short form:

| Kind                              | Severity  | Eligible when                                                    |
| --------------------------------- | --------- | ---------------------------------------------------------------- |
| `incomplete_task`                 | CRITICAL  | Evidence of completion exists → mark checkbox                    |
| `missing_requirement_implementation` | CRITICAL | Single file ≤150 LoC change                                   |
| `spec_divergence`                 | WARNING   | Code is correct, spec is outdated → update delta spec             |
| `scenario_uncovered`              | WARNING   | Test file already exists for the capability → add a case          |
| `pattern_deviation`               | SUGGESTION | Single-line or lint-fixable                                     |
| `missing_comment_why`             | SUGGESTION | Scope ≤5 lines                                                  |

Everything else defers automatically.

**Legacy Changes (no prior state / no report)**

For changes created before this command learned about state and reports:

- `.opsx-state.json` missing → create it on this invocation. Infer `createdAt` from the change directory mtime, set `proposedAt = createdAt`, set `appliedAt = createdAt` if any task is `[x]`, leave `reviewedAt = null`, `reviewWaived = false`.
- `verify-report.md` missing → copy the template as usual and run verify normally.

**Stability Check Details**

The stability check compares `deferred_ids` (sorted array of finding IDs) between iteration N and iteration N-1. Stability means the arrays are equal. Equal sets means no new deferrals and no resolved deferrals — the triage loop has reached a fixed point.

Oscillation means the sets differ but each set repeats at least once across the last 3 iterations. Example: `{a,b,c} → {a,b,d} → {a,b,c}`. Detected by hashing each iteration's set and checking for cycles.

**Output Format**

Report file follows `openspec/templates/verify-report.md` exactly. Chat summary is ≤3 lines pointing at the file. Never inline the full report in chat.

**Guardrails**

- Always prompt for change selection if not provided.
- Always copy the template on first run; never hand-write the report structure.
- Always run the schema linter before finishing.
- Never silently omit manual actions.
- Never apply auto-fixes outside the rule set.
- Never exceed the per-iteration LoC budget.
- Never skip the state file update in non-dry-run mode.
- Never write the diff-mode report to `verify-report.md` — use `verify-report.diff.md`.
- Never ask for confirmation between steps. The pipeline is autonomous; user confirmation lives at archive time.
