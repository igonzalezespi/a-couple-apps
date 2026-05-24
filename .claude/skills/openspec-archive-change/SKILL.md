---
name: openspec-archive-change
description: "Archive completed change → PR body, deferred issues, labels."
license: MIT
compatibility: Requires openspec CLI, gh CLI, verify-report.md persisted by /opsx:verify.
metadata:
  author: a-couple-apps
  version: '2.0'
  generatedBy: '1.2.0'
---

Archive a completed change. The archive step is the mechanical end-of-lifecycle transformer: it reads the persisted `verify-report.md`, enforces scorecard thresholds from `openspec/project.md`, composes the PR body from `.github/PULL_REQUEST_TEMPLATE.md`, creates GitHub issues for deferred work, creates GitHub issues for each manual action, applies labels conditionally, and updates `.opsx-state.json`.

See `.claude/skills/sdd-workflow/SKILL.md` `## /opsx:archive Rules` for the a-couple-apps-specific ordering and policies. This skill implements the generic flow.

**Input**: Optionally specify a change name. If omitted, infer from context or prompt via `AskUserQuestion`.

## Flow

1. **Select the change** — `openspec list --json` + `AskUserQuestion`. Never auto-pick.
2. **Load state + artifacts** — `openspec status --change "<name>" --json`, `node scripts/opsx/state.mjs read openspec/changes/<name>`. Warn on incomplete artifacts/tasks and confirm via `AskUserQuestion`.
3. **Read `verify-report.md`** — `node scripts/opsx/verify-report-parser.mjs openspec/changes/<name>/verify-report.md`. Use the parsed object, never regex. Missing report → legacy path (see Backward Compat below).
4. **Check scorecard thresholds** — Load `openspec/project.md` (`verify.thresholds.*`). Compare scorecard values from the report. If any threshold is breached, prompt via `AskUserQuestion` with options `Abort`, `Override this run`, `Update thresholds in project.md`.
5. **Assess delta spec sync state** — Compare `openspec/changes/<name>/specs/*` with `openspec/specs/<capability>/spec.md`. Prompt to sync, then perform the sync **inline** (read delta specs, edit main specs directly per `.claude/skills/openspec-sync-specs/SKILL.md` rules). Do NOT invoke the Skill tool — it breaks the pipeline.
6. **Run `code-reviewer` via Agent tool (MANDATORY)** — Use the **Agent tool** with `subagent_type: "code-reviewer"`, pass `git diff origin/main...HEAD`. Do NOT use the Skill tool. Fix CRITICAL / WARNING findings before proceeding. Never skip.
7. **Commit all changes** — `git status` must be clean before push. Group orphaned deletions into separate conventional commits.
8. **Rebase and push** — `git fetch origin && git rebase origin/main && git push -u origin HEAD`. Verify tracking via `git config --get branch.$(git branch --show-current).remote`.
9. **Move change dir to archive** — `mv openspec/changes/<name> openspec/changes/archive/YYYY-MM-DD-<name>`. Fail on target collision. `.opsx-state.json`, `verify-report.md`, `.openspec.yaml`, `review-report.md` ride along.
10. **Ensure labels exist** (idempotent):

    | Label                             | Color    | Description                                       |
    | --------------------------------- | -------- | ------------------------------------------------- |
    | `opsx:follow-up`                  | `5319E7` | PR has deferred verify follow-ups                 |
    | `needs:manual-qa`                 | `D93F0B` | PR needs human manual verification                |
    | `opsx:unverified`                 | `FBCA04` | PR archived without verify-report.md              |
    | `opsx:deferred`                   | `5319E7` | Issue spawned from /opsx:verify deferred work     |
    | `opsx:follow-up:<origin-change>`  | `5319E7` | Per-change namespaced tag on spawned issues       |

    ```bash
    gh label create "<label>" --description "<desc>" --color "<color>" 2>/dev/null || true
    ```

    The per-change variant `opsx:follow-up:<origin-change>` MUST be created
    before any `gh issue create --label "opsx:follow-up:<origin-change>"` call
    in step 11 — otherwise the issue create fails with a label-not-found error
    and a deferred entry is silently dropped.

11. **Create GitHub issues for deferred work**

    - Controlled by `verify.archive.create_deferred_issues` (default `true`).
    - `AskUserQuestion` confirmation if entry count ≥ `verify.archive.deferred_issue_batch_prompt_threshold` (default 5).
    - `gh auth status` must succeed — abort otherwise; never silently drop.

    Issue body template:

    ```markdown
    ## Source Change

    `<origin-change>` archived to `openspec/changes/archive/YYYY-MM-DD-<origin>/`.

    ## Why Deferred

    <why-deferred>

    ## Affected Files

    <bullet list>

    ## Propose Command

    ```
    /opsx:propose <suggested-kebab-name>
    > <description>
    ```

    ## Link to Verify Report

    `openspec/changes/archive/YYYY-MM-DD-<origin>/verify-report.md` (entry `<finding-id>`)
    ```

    Create each:

    ```bash
    gh issue create \
      --title "<title>" \
      --body "$(cat /tmp/issue-body.md)" \
      --label "opsx:deferred" \
      --label "opsx:follow-up:<origin-change>"
    ```

    Collect returned URLs + numbers.

12. **Compose PR body mechanically**

    Read `.github/PULL_REQUEST_TEMPLATE.md`. Fill placeholders:

    - **Issue auto-close header (above `## Summary`)**: source priority is `.opsx-state.json.closesIssues` (canonical) → otherwise scan `proposal.md` for issue refs via `/(?:closes?|fixes?|resolves?)\s+#?(\d+)/gi`, `/(?:github\s+issue|issue)\s+#?(\d+)/gi`, `/\(#(\d+)\)/g`. Dedupe matched numbers and prepend one `Closes #<n>` line per issue at the very top of the body so GitHub auto-closes them on merge. Skip numbers already prefixed by a closing keyword.
    - **Summary**: first paragraph of `proposal.md` `## Why`.
    - **Change Reference**: archive path, report path, schema, verify status from `.opsx-state.json`.
    - **Verify Findings** (verbatim from the parsed report):
      - **Fixes Applied During Verify**
      - **Deferred Work** — replace each raw `/opsx:propose` fenced block with `- #<issue-number> <title> — <issue-url>`
      - **Spec Drift Resolutions**
    - **Manual QA Checklist**: one checkbox per `## Manual Actions Required` entry, each linking `openspec/manual-checks/<id>.md` when referenced.
    - **Test Plan**: author-drafted list. Run every automated item before creating the PR and mark `[x]`. Never create a PR with unchecked automated items.
    - **Pre-Merge Checklist**: leave as-is.

    Empty sections render as `_None_`. Legacy (missing report) renders as `_None — no verify report available_` across `Verify Findings` and `Manual QA Checklist`.

13. **Create the PR**

    ```bash
    gh pr create --title "<conventional-commit title>" --body "$(cat /tmp/pr-body.md)"
    ```

    Capture PR URL + number.

14. **Apply conditional labels**

    - `opsx:follow-up` when `## Deferred Work` is non-empty.
    - `needs:manual-qa` when `## Manual Actions Required` is non-empty.
    - `opsx:unverified` when no `verify-report.md` was present.

    ```bash
    gh pr edit <pr-number> --add-label "<label>"
    ```

15. **Apply CI labels**

    Read `.openspec.yaml` → `ciLabels`. Create each label idempotently and attach:

    | Label         | Description                                             | Color               |
    | ------------- | ------------------------------------------------------- | ------------------- |
    | `ci:full`     | Run all quality-gates jobs + mutation + bundle analysis | `D93F0B` (red)      |
    | `ci:e2e`      | Force e2e tests on this PR                              | `0E8A16` (green)    |
    | `ci:lhci`     | Force Lighthouse CI on this PR                          | `0E8A16` (green)    |
    | `ci:nfr`      | Force NFR gate on this PR                               | `0E8A16` (green)    |
    | `ci:security` | Force container-scan + SBOM on this PR                  | `B60205` (dark red) |
    | `ci:mutation` | Trigger Stryker mutation testing                        | `5319E7` (purple)   |
    | `ci:bundle`   | Trigger bundle size analysis                            | `5319E7` (purple)   |

    Backward compat: `ciProfile: extended` → `[ci:mutation, ci:bundle]`. Both absent → skip.

16. **Create GitHub issues for manual actions**

    For each `## Manual Actions Required` entry, run `gh issue create` with labels `opsx:manual-action`, `opsx:manual-action:<origin-change>`, and `needs:manual-qa`. Issue body references the library recipe (when present), inline steps (when no recipe applies), and the pass criteria from the report.

    ```bash
    gh issue create \
      --title "[manual] <short title>" \
      --body "$(cat /tmp/manual-issue-body.md)" \
      --label "opsx:manual-action" \
      --label "opsx:manual-action:<origin-change>" \
      --label "needs:manual-qa"
    ```

    Idempotent: before creating, search by per-change label + finding-id and reuse the existing issue if found. The PR body's `## Manual QA Checklist` lists each issue as `- [ ] #<n> <title> — <url>`. Controlled by `verify.archive.create_manual_action_issues` (default `true`); the `deferred_issue_batch_prompt_threshold` applies jointly to deferred + manual entries.

17. **Update `.opsx-state.json`**

    Each `deferredIssues` and `manualActionIssues` entry MUST include BOTH `id` and `findingId` (in practice the same 8-hex hash). Both are required by `openspec/schemas/opsx-state.schema.json`.

    ```bash
    node scripts/opsx/state.mjs set "$TARGET" '{
      "archivedAt": "<ISO-8601>",
      "prUrl": "<url>",
      "prNumber": <n>,
      "deferredIssues": [ { "id": "a1b2c3d4", "findingId": "a1b2c3d4", "number": 123, "url": "https://github.com/..." } ]
    }'
    ```

18. **Return the PR URL and summary**

    Single final block listing archive location, scorecard status, labels applied, deferred issues created, manual checks synced, PR URL.

## Backward Compatibility (Legacy Changes)

Changes created before this skill learned about `verify-report.md` / `.opsx-state.json`:

- Missing `verify-report.md` → treat as empty, apply `opsx:unverified` label, proceed without error. Controlled by `verify.thresholds.block_on_missing_report` (default `false`).
- Missing `.opsx-state.json` → create it on archive with `archivedAt`, `prUrl`, `prNumber` populated from the archive operation; other lifecycle fields left `null`.

## Guardrails

- Always prompt for change selection if not provided.
- Always parse the verify report via `verify-report-parser.mjs`; never regex.
- Never skip `code-reviewer`.
- **Never use the Skill tool mid-archive.** Sync and code-review must be inline or via Agent tool. Skill tool yields control and breaks the pipeline.
- Never create a PR with a dirty tree or unchecked automated test-plan items.
- Never silently drop deferred items (`gh auth` failure → abort).
- Always update `.opsx-state.json` on successful archive.
- Idempotent label creation (`gh label create … || true`).
- Missing report ≠ error — apply `opsx:unverified` and proceed.
