---
name: 'OPSX: Archive'
description: Archive a completed change — read verify-report.md, compose PR body mechanically from the template, create deferred + manual-action issues, apply labels
category: Workflow
tags: [workflow, archive, experimental]
---

Archive a completed change. This is the mechanical end-of-lifecycle step: it reads the persisted `verify-report.md`, enforces scorecard thresholds, composes the PR body from `.github/PULL_REQUEST_TEMPLATE.md`, creates GitHub issues for deferred work, applies labels, and moves the change directory to the archive. Every step is autonomous once thresholds pass.

**Input**: Optionally specify a change name (e.g., `/opsx:archive add-auth`). If omitted, infer from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context
   - Run `openspec list --json` and use the **AskUserQuestion tool** to let the user select (never auto-pick)

2. **Load state and artifacts**

   ```bash
   openspec status --change "<name>" --json
   node scripts/opsx/state.mjs read openspec/changes/<name>
   ```

   Parse the status JSON for `schemaName` and `artifacts`. Read `.opsx-state.json` for lifecycle timestamps and prior verify status.

   **If any artifacts are incomplete**: Warn via `AskUserQuestion` ("Abort / Continue anyway") and note the warning in the final summary.

   **If tasks.md has incomplete items**: Same — warn and confirm.

3. **Read `verify-report.md`**

   Target path: `openspec/changes/<name>/verify-report.md`.

   ```bash
   node scripts/opsx/verify-report-parser.mjs openspec/changes/<name>/verify-report.md
   ```

   The parser returns a typed object with the 8 H2 sections and 3 H3 sub-sections under Findings. Use the parsed structure; never regex the file.

   **Missing report** (legacy change):
   - If `openspec/project.md` `verify.thresholds.block_on_missing_report: true`, refuse to proceed and instruct the user to run `/opsx:verify` first.
   - Otherwise, treat the report as empty (all sections render as `_None — no verify report available_`), queue the `opsx:unverified` label, and proceed.

4. **Check scorecard thresholds**

   Load `openspec/project.md` via `node scripts/opsx/project-config.mjs` (single fenced YAML block). Extract `verify.thresholds.requirement_coverage_min`, `verify.thresholds.scenario_coverage_min`.

   Parse the `## Scorecard` table from the report. Compute `requirement_coverage` (Correctness row) and `scenario_coverage` (Test Compliance / scenarios covered row).

   **If any threshold is breached**:

   Use `AskUserQuestion` with three options:
   - **Abort** — stop the archive, user must triage the report first.
   - **Override this run** — proceed, log the override reason into the archive commit body.
   - **Update thresholds in project.md** — open `openspec/project.md`, adjust, re-read, re-check.

   Do not silently bypass thresholds.

5. **Assess delta spec sync**

   Check `openspec/changes/<name>/specs/`. If delta specs exist, compare each to `openspec/specs/<capability>/spec.md` and summarize adds/modifications/removals/renames. Prompt:

   - Changes needed: **Sync now (recommended)** / **Archive without syncing**
   - Already synced: **Archive now** / **Sync anyway** / **Cancel**

   On sync, perform the sync **inline** — read each delta spec under `openspec/changes/<name>/specs/*/spec.md`, then edit the corresponding main spec at `openspec/specs/<capability>/spec.md` directly, following the merge rules in `.claude/skills/openspec-sync-specs/SKILL.md`. Do NOT use the Skill tool for sync; it yields control to the user and breaks the archive pipeline.

6. **Run `code-reviewer` via Agent tool (MANDATORY)**

   Get the full diff:

   ```bash
   git fetch origin && git diff origin/develop...HEAD
   ```

   Use the **Agent tool** with `subagent_type: "code-reviewer"` — NOT the Skill tool. Pass the diff. Fix CRITICAL / WARNING findings before proceeding; acknowledge SUGGESTIONs. Never skip this step.

7. **Commit all changes**

   Run `git status`. Stage and commit any modifications, deletions, or new files that belong to the change. Group orphaned work (e.g., deletions from a prior session) into a separate conventional commit. Never proceed with a dirty tree.

8. **Rebase and push**

   ```bash
   git fetch origin
   git rebase origin/develop
   git push -u origin HEAD
   ```

   Verify tracking:

   ```bash
   git config --get branch.$(git branch --show-current).remote
   ```

   If empty, fix with `git branch --set-upstream-to=origin/$(git branch --show-current)`.

9. **Perform the archive move**

   Create the target if missing, fail on collision:

   ```bash
   mkdir -p openspec/changes/archive
   TARGET="openspec/changes/archive/$(date -u +%Y-%m-%d)-<name>"
   test -e "$TARGET" && { echo "target exists: $TARGET"; exit 1; }
   mv "openspec/changes/<name>" "$TARGET"
   ```

   `verify-report.md`, `.opsx-state.json`, `.openspec.yaml`, `review-report.md` (if present) all ride along.

10. **Ensure labels exist (idempotent)**

    Create each label once; failures on existing labels are ignored.

    ```bash
    gh label create "opsx:follow-up"     --description "PR has deferred verify follow-ups"                       --color "5319E7" 2>/dev/null || true
    gh label create "needs:manual-qa"    --description "PR needs human manual verification"                      --color "D93F0B" 2>/dev/null || true
    gh label create "opsx:unverified"    --description "PR archived without verify-report.md"                    --color "FBCA04" 2>/dev/null || true
    gh label create "opsx:deferred"      --description "Backlog issue spawned from /opsx:verify deferred work"   --color "5319E7" 2>/dev/null || true
    gh label create "opsx:manual-action" --description "Issue spawned from /opsx:verify manual-action work"      --color "D93F0B" 2>/dev/null || true
    ```

    Also create `opsx:follow-up:<origin-change>` (same color as `opsx:deferred`) and `opsx:manual-action:<origin-change>` (same color as `opsx:manual-action`). These per-change variants are used when tagging spawned issues so each change has a discoverable backlog.

11. **Create GitHub issues for deferred work**

    Read the parsed `## Deferred Work` entries from step 3.

    - If `verify.archive.create_deferred_issues: false`, skip this step.
    - If entry count `>= verify.archive.deferred_issue_batch_prompt_threshold` (default 5), use `AskUserQuestion` to confirm batch creation before proceeding (show count + titles).
    - **Auth check**: run `gh auth status`. If not authenticated, abort the archive — never silently drop deferred items. The state file is left unchanged.

    For each entry, compose an issue body from this template:

    ```markdown
    ## Source Change

    `<origin-change-name>` archived to `openspec/changes/archive/YYYY-MM-DD-<origin>/`.

    ## Why Deferred

    <why-deferred from the entry>

    ## Affected Files

    <affected files bullet list>

    ## Propose Command

    ```
    /opsx:propose <suggested-kebab-name>
    > <1–3 sentence description>
    ```

    ## Link to Verify Report

    `openspec/changes/archive/YYYY-MM-DD-<origin>/verify-report.md` (see `## Deferred Work` entry `<finding-id>`)
    ```

    Create the issue:

    ```bash
    gh issue create \
      --title "<short title>" \
      --body "$(cat /tmp/issue-body.md)" \
      --label "opsx:deferred" \
      --label "opsx:follow-up:<origin-change>"
    ```

    Collect the issue URL and number for each created issue. Write the per-issue mapping to `/tmp/deferred-issues.json` as a JSON array of `{ "findingId": "<8-hex>", "number": <int>, "url": "<gh-issue-url>" }` objects. The `findingId` MUST match the verify-report entry's `**Finding ID**: <hex>` value byte-for-byte.

12. **Compose the PR body from template + parsed report**

    Read `.github/PULL_REQUEST_TEMPLATE.md`. Replace the placeholder sections mechanically:

    - **Issue auto-close header (above `## Summary`)**: collect issue numbers to close on merge. Source priority:
      1. `.opsx-state.json.closesIssues` (array of numbers) — canonical, use verbatim if present.
      2. Otherwise, scan `proposal.md` (full file) for issue references with these patterns and dedupe the matched numbers:
         - `/(?:closes?|fixes?|resolves?)\s+#?(\d+)/gi` — already-closing-keyword refs
         - `/(?:github\s+issue|issue)\s+#?(\d+)/gi` — prose refs ("Github Issue 47", "Issue #47")
         - `/\(#(\d+)\)/g` — bare parenthetical refs ("(#47)")

      For each unique number, prepend a `Closes #<n>` line at the very top of the assembled PR body (before `## Summary`), one per line. Skip numbers already prefixed by a closing keyword in the assembled body to avoid duplicate `Closes #N` lines. GitHub will then auto-close those issues when the PR merges.
    - **Summary**: first paragraph of `proposal.md` `## Why`.
    - **Change Reference**: populate the bullet list with the archive path, verify report path, schema, and verify status from `.opsx-state.json`.
    - **Verify Findings**:
      - **Fixes Applied During Verify**: copy verbatim from the report's H2 section (render `_None_` if empty).
      - **Deferred Work**: copy verbatim, but replace each raw `/opsx:propose` fenced block with the corresponding GitHub issue URL from step 11 (`- #<issue-number> <title> — <issue-url>`).
      - **Spec Drift Resolutions**: copy verbatim.
    - **Manual QA Checklist**: render `## Manual Actions Required` as a checkbox list. Each line is `- [ ] #<issue-number> <title> — <issue-url>` using the GitHub issue created in step 16. The reviewer ticks the box once the linked issue is closed.
    - **Test Plan**: leave the human-drafted list; before creating the PR, **run every automated item** and mark `[x]` only after confirming it passes. Never create a PR with unchecked automated items.
    - **Pre-Merge Checklist**: leave as-is (author ticks manually before merge).

    Legacy (no report): render the `Verify Findings` and `Manual QA Checklist` sections as `_None — no verify report available_` and queue the `opsx:unverified` label.

13. **Create the PR**

    ```bash
    gh pr create --title "<type(scope): description>" --body "$(cat /tmp/pr-body.md)"
    ```

    Use conventional commit format for the title. Capture the PR URL and number.

14. **Apply conditional labels**

    Use the parsed report to decide:

    ```bash
    # Always applied when deferred entries exist:
    [[ $deferred_count -gt 0 ]] && gh pr edit <pr-number> --add-label "opsx:follow-up"
    # Always applied when manual action entries exist:
    [[ $manual_count -gt 0 ]] && gh pr edit <pr-number> --add-label "needs:manual-qa"
    # Legacy fallback when no report is present:
    [[ $missing_report -eq 1 ]] && gh pr edit <pr-number> --add-label "opsx:unverified"
    ```

15. **Apply CI labels**

    Read `.openspec.yaml` from the archived change directory. For each label in `ciLabels`, create it idempotently and attach:

    | Label         | Description                                             | Color               |
    | ------------- | ------------------------------------------------------- | ------------------- |
    | `ci:full`     | Run all quality-gates jobs + mutation + bundle analysis | `D93F0B` (red)      |
    | `ci:e2e`      | Force e2e tests on this PR                              | `0E8A16` (green)    |
    | `ci:lhci`     | Force Lighthouse CI on this PR                          | `0E8A16` (green)    |
    | `ci:nfr`      | Force NFR gate on this PR                               | `0E8A16` (green)    |
    | `ci:security` | Force container-scan + SBOM on this PR                  | `B60205` (dark red) |
    | `ci:mutation` | Trigger Stryker mutation testing                        | `5319E7` (purple)   |
    | `ci:bundle`   | Trigger bundle size analysis                            | `5319E7` (purple)   |

    Backward compat: if `ciLabels` is absent but `ciProfile: extended` is set, treat as `[ci:mutation, ci:bundle]`. If both are absent, skip (path filtering handles CI gating).

16. **Create GitHub issues for manual actions**

    Read the parsed `## Manual Actions Required` entries from step 3.

    - If `verify.archive.create_manual_action_issues: false`, skip this step.
    - The `deferred_issue_batch_prompt_threshold` in `openspec/project.md` applies jointly to deferred + manual-action entries: if `(deferred_count + manual_count) >= threshold` (default 5) and the deferred-work prompt did not already fire, use `AskUserQuestion` once for the combined batch before creating any manual-action issues.
    - **Auth check**: `gh auth status` must succeed — abort the archive if not authenticated; never silently drop manual actions.
    - **Idempotent**: before creating, run `gh issue list --label "opsx:manual-action:<origin-change>" --state all --search "<finding-id>" --json number,url`. If a match exists, reuse that issue number/URL instead of creating a duplicate.

    For each entry, compose an issue body from this template:

    ```markdown
    ## Source Change

    `<origin-change-name>` archived to `openspec/changes/archive/YYYY-MM-DD-<origin>/`.

    ## Why Agent Cannot Verify

    <why-cannot-verify from the entry — visual / third-party / environment / secrets / human-judgment / hardware>

    ## Recipe

    [<recipe-id>](../manual-checks/<recipe-id>.md)   _(omit this section if no library recipe applies)_

    ## Steps

    <inline steps from the verify-report entry, when no recipe matches>

    ## Pass Criteria

    <observable outcome — exactly as written in the report>

    ## Link to Verify Report

    `openspec/changes/archive/YYYY-MM-DD-<origin>/verify-report.md` (see `## Manual Actions Required` entry `<finding-id>`)
    ```

    Create the issue:

    ```bash
    gh issue create \
      --title "[manual] <short title>" \
      --body "$(cat /tmp/manual-issue-body.md)" \
      --label "opsx:manual-action" \
      --label "opsx:manual-action:<origin-change>" \
      --label "needs:manual-qa"
    ```

    Collect the issue URL and number for each created (or pre-existing) issue. The PR body's `## Manual QA Checklist` lists each as `- [ ] #<issue-number> <title> — <issue-url>` (replacing the recipe-only reference).

17. **Update `.opsx-state.json`**

    Each `deferredIssues` and `manualActionIssues` entry requires BOTH `id` (internal identifier — in practice the same hash as the finding ID) and `findingId` (cross-reference to the report). Both fields are required by `openspec/schemas/opsx-state.schema.json` and will be rejected by `scripts/opsx/state.mjs` `validateState` if missing.

    ```bash
    node scripts/opsx/state.mjs set "$TARGET" '{
      "archivedAt": "<ISO-8601 now>",
      "prUrl": "<pr-url>",
      "prNumber": <pr-number>,
      "deferredIssues":      [ { "id": "a1b2c3d4", "findingId": "a1b2c3d4", "number": 123, "url": "https://github.com/..." }, ... ],
      "manualActionIssues":  [ { "id": "e5f6g7h8", "findingId": "e5f6g7h8", "number": 124, "url": "https://github.com/..." }, ... ]
    }'
    ```

18. **Run the post-archive safety check**

    Before returning control, run the safety check to confirm the archive is clean. Call it inline via Bash — do NOT use the Skill tool:

    ```bash
    node scripts/opsx/post-archive-safety-check.mjs "<change-name>"
    ```

    The script asserts: clean working tree, no orphan stashes on the current branch, upstream configured, all commits pushed, `openspec/changes/<name>/` no longer present, `.opsx-state.json` lifecycle populated (`archivedAt`, `prUrl`, `prNumber`), PR OPEN/MERGED with green checks, and every deferred GitHub issue reachable. See `.claude/commands/opsx/safe-to-remove.md` for the full schema.

    - Exit `0` → report `SAFE TO REMOVE` verdict in the final summary. Nothing else — the worktree is auto-removed when the user leaves the conversation, so do NOT emit `git worktree remove` / `git branch -D` commands.
    - Exit `2` (warnings) → report `WARN` and list the non-blocking checks that deferred (e.g., pending CI). No removal commands.
    - Exit `1` (blocked) → report `BLOCKED`, include the blockers verbatim, and propose remediation for each. No removal commands.

    **Do NOT** remove the worktree on the user's behalf, and do NOT instruct the user to remove it. This command is read-only confirmation.

19. **Return PR URL and summary**

    Final chat output — ONE block showing archive location, labels applied, deferred issues created, manual-action issues created, the PR URL, and the safety-check verdict. No prompts between steps 6 and 18. **Never emit `git worktree remove` / `git branch -D` commands** — the worktree is auto-removed when the user leaves the conversation.

**Output On Success**

```
## Archive Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Archived to:** openspec/changes/archive/YYYY-MM-DD-<name>/
**Verify status:** READY | READY_WITH_WARNINGS | BLOCKED | RECONSTRUCTED
**Scorecard:** requirement_coverage=0.92, scenario_coverage=0.85 (thresholds met)
**Specs:** ✓ Synced
**Labels:** opsx:follow-up, needs:manual-qa, ci:full
**Deferred issues:** 3 created (#123, #124, #125)
**Manual-action issues:** 2 created (#126, #127)
**PR:** <PR URL>
**Safety check:** SAFE TO REMOVE | WARN | BLOCKED
```

**Output On Threshold Block**

```
## Archive Blocked — Scorecard Threshold Breach

**Change:** <change-name>
**Breach:** requirement_coverage=0.62 (threshold ≥ 0.80)

**Options:**
1. Abort — triage the report and re-verify
2. Override this run (logged in commit body)
3. Update thresholds in openspec/project.md
```

**Guardrails**

- Always prompt for change selection if not provided.
- Always parse `verify-report.md` via the parser script. Never regex.
- Never silently drop deferred items or manual actions — abort on `gh auth` failure.
- Never skip `code-reviewer`.
- Never create a PR with a dirty tree or unchecked automated test-plan items.
- **Never use the Skill tool mid-archive.** Sub-operations (sync, code-review) must be performed inline or via the Agent tool. The Skill tool yields control to the user and breaks the autonomous pipeline.
- Always update `.opsx-state.json` after a successful archive (both `deferredIssues` and `manualActionIssues`).
- Idempotent label creation (trailing `|| true` only on `gh label create`).
- Idempotent issue creation: search by per-change label + finding-id before `gh issue create`; reuse the existing issue when found.
- Missing report = legacy path, not an error — apply `opsx:unverified`.
- Manual actions become GitHub issues, never tracked-task entries in another change directory.
