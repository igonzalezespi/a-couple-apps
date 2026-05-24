---
name: 'OPSX: Safe to Remove Worktree'
description: Post-archive safety check — verify tree clean, commits pushed, PR healthy, and state.json shows `archived` lifecycle before manually removing the feature worktree.
category: Workflow
tags: [workflow, worktree, archive, safety]
---

Run the post-archive safety check so the user can confidently `git worktree remove` without losing work.

**Input**: Optionally specify a change name (e.g., `/opsx:safe-to-remove add-auth`). If omitted, infer from the current branch name (`feat/<name>`) or conversation context. If ambiguous, prompt via **AskUserQuestion** with the archived changes under `openspec/changes/archive/`.

**Steps**

1. **Resolve the change**

   - If an arg is provided, use it verbatim.
   - Else parse `git rev-parse --abbrev-ref HEAD`. If it matches `feat/<name>`, use `<name>`.
   - Else list `openspec/changes/archive/*/` and prompt with `AskUserQuestion`.

2. **Run the checker**

   ```bash
   node scripts/opsx/post-archive-safety-check.mjs <change-name>
   ```

   The script asserts in sequence:

   1. `git status --porcelain` → empty (no uncommitted/untracked files).
   2. `git stash list` → no entries mentioning the current branch.
   3. Current branch has an upstream configured.
   4. `git log @{u}..HEAD` → empty (all commits pushed).
   5. `openspec/changes/<name>/` does NOT exist (archive move succeeded).
   6. `openspec/changes/archive/*-<name>/.opsx-state.json` lifecycle = archived (`archivedAt`, `prUrl`, `prNumber` all non-null).
   7. GitHub PR is OPEN or MERGED, not CONFLICTING, status-check rollup has no FAILURE entries.
   8. Every `deferredIssues[].number` resolves via `gh issue view`.

   Exit codes:
   - `0` — SAFE TO REMOVE.
   - `1` — BLOCKED (at least one blocker finding).
   - `2` — WARN (pending checks, `gh` unauthenticated, etc.).
   - `3` — Usage/invocation error.

3. **Report the verdict**

   Relay the stdout block verbatim. On BLOCKED, list the specific blockers and suggest the fix (commit, push, re-archive, etc.). Never tell the user it is safe unless the script exits `0`.

   On `SAFE TO REMOVE`, surface the worktree path from `git worktree list` and the exact command the user will run themselves:

   ```
   git worktree remove <path-to-worktree>
   git branch -D feat/<change-name>   # optional: delete the local branch
   ```

   **Do NOT** execute worktree removal on the user's behalf. The user removes the worktree manually — this command only confirms it is safe to do so.

**Flags**

- `--skip-gh` — skip GitHub checks (offline mode). State + local checks still enforced.
- `--json` — emit a machine-readable JSON report instead of the human block.

**Output On Success**

```
Post-Archive Safety Check — add-auth
Branch: feat/add-auth
Archive: /home/.../openspec/changes/archive/2026-04-14-add-auth
────────────────────────────────────────────────────────────
✓ working tree clean: no uncommitted changes
✓ no orphan stashes: stash list is empty
✓ upstream tracking: tracking origin/feat/add-auth
✓ all commits pushed: local matches upstream
✓ change moved to archive: openspec/changes/add-auth/ is gone (archived)
✓ state lifecycle = archived: archived 2026-04-14T10:00:00Z, PR #200
✓ PR health: PR #200 MERGED
✓ deferred issues reachable: 3 issue(s) reachable
────────────────────────────────────────────────────────────
Verdict: SAFE TO REMOVE WORKTREE

Run yourself:
  git worktree remove /home/.../worktrees/add-auth
  git branch -D feat/add-auth
```

**Output On Blocked**

```
Verdict: BLOCKED — do NOT remove worktree yet
Blockers:
  ✗ all commits pushed: 2 commit(s) not pushed to upstream
  ✗ state lifecycle = archived: state file missing fields: prUrl, prNumber
```

**Guardrails**

- Never auto-remove the worktree. The user does it manually.
- Never claim success when the script exits non-zero.
- Do not mutate state, delete branches, force-push, or touch remote resources — this command is strictly read-only.
