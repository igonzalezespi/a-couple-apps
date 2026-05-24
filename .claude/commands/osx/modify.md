---
name: 'OSX: Modify'
description: Modify an existing artifact in an OpenSpec change with dependency-aware updates. Use during pre-implementation review iteration (after /osx:review feedback) or during implementation when requirements change.
category: Workflow
tags: [workflow, artifacts, experimental]
---

Modify an existing artifact in an OpenSpec change with dependency-aware updates.

**Input**: Optionally specify a change name and an artifact ID (e.g., `/osx:modify add-auth proposal`). Infer from context if omitted; prompt via `AskUserQuestion` if ambiguous.

**Examples**:

- `/osx:modify add-auth` — modify change `add-auth` (will prompt for artifact)
- `/osx:modify add-auth proposal` — modify `proposal.md` in `add-auth`
- "Fix the missing rationale in design Decision 2" — infer change/artifact from context

**IMPORTANT**: `context` and `rules` from `openspec instructions` are constraints for YOU, not content for the artifact file. Do NOT copy `<context>`, `<rules>`, or `<project_context>` blocks into artifacts.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change.
   - Auto-select if exactly one active change exists.
   - If ambiguous, run `openspec list --json` and use the **AskUserQuestion** tool to let the user choose. Mark the most recently modified as `(Recommended)`.

   Always announce: `Using change: <name>` and how to override (e.g., `/osx:modify <other> <artifact>`).

2. **Check change status**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse:
   - `schemaName` — the workflow being used (e.g., `spec-driven`).
   - `artifacts` — array with status (done/ready/blocked).
   - `isComplete` — whether all artifacts are done.

3. **Select the artifact to modify**

   If an artifact ID is specified, use it. Otherwise:
   - If only one artifact has status `ready`: auto-select it.
   - If the user described content (e.g., "the requirements", "the design"): match by name.
   - If multiple are ready and there's no direction: use **AskUserQuestion** to prompt, presenting artifacts in schema order with `id`, `status`, `dependencies count`, `unlocks count`.

4. **Get modification context**

   ```bash
   openspec instructions <artifact-id> --change "<name>" --json
   ```

   Extract:
   - `rules` — validation rules (constraints for you).
   - `context` — project background (constraints for you).
   - `template` — expected structure.
   - `dependencies` — artifacts this one depends on.
   - `unlocks` — artifacts that depend on this one.
   - `outputPath` — where the artifact lives.
   - `instruction` — schema-specific guidance.

   **Read the current artifact file** from `outputPath` before editing.

5. **Detect workflow scenario**

   - If the user references review-report.md output or specific finding IDs (`F001`, `F002`, …) → **Review Iteration Mode**. Validate fixes against the review criteria; after modification, suggest re-running `/osx:review`.
   - If the user describes new requirements or changes discovered during coding → **Amendment Mode**. Capture requirement changes; consider impact on existing implementation; after modification, suggest `/opsx:apply <name>`.

6. **Display validation constraints**

   Show the user:
   - The `rules` array (as constraints, not content).
   - The `dependencies` list (what this artifact relies on).
   - The `unlocks` list (what artifacts depend on this).

7. **Determine modification mode**

   - **Mode A: Describe Changes** — natural language ("add a requirement for…", "update the design to…", "remove this section…").
   - **Mode B: Interactive Edit** — specific content references ("change line 42 to…", "replace the second paragraph…", "update the authentication section…").

   Auto-select based on input type. No explicit prompt needed.

8. **Apply modifications**

   **Mode A (Describe Changes)**:
   - Parse the user's description.
   - Analyze current artifact content.
   - Identify which sections need changes.
   - Apply changes autonomously if clear; if ambiguous, pause and ask for clarification via **AskUserQuestion**.

   **Mode B (Interactive Edit)**:
   - Parse the entire artifact file.
   - Identify relevant sections based on user intent.
   - Show only those sections (not the entire file).
   - Apply targeted changes via the **Edit** tool.
   - Repeat for additional sections.

9. **Validate modifications**

   Check proposed changes against:

   a) The `rules` array from step 4 (structural/format requirements).

   b) **Review Iteration Mode**: the specific findings from `review-report.md`.

   c) **Amendment Mode**: backward compatibility with existing implementation.

   Handle results:
   - Clear/fixable violations → fix automatically and continue.
   - Ambiguous violations → explain and ask the user.
   - User intent clear despite a violation → proceed with a warning.

   Use `rules` from instructions. Do NOT run `openspec validate` here — the workflow has separate validation steps.

10. **Write the updated artifact file**

    Use **Edit** for targeted changes, **Write** for complete rewrites. Verify the file was written successfully (the Edit tool reports the resulting block; the Write tool returns success).

11. **Handle dependent artifacts**

    From the instructions output, check the `unlocks` array (reverse dependencies).

    For each artifact in `unlocks`:
    - Run `openspec instructions <dependent-id> --change "<name>" --json`.
    - Read the dependent artifact file.
    - Analyze whether the modification affects this dependent artifact.
    - Track affected artifacts.

    **Decision logic** (prefer reasonable decisions):
    - **Single dependent affected** → auto-update and explain (no prompt).
    - **Multiple dependents affected** → show the list and prompt for confirmation.
    - **User said "cascade"** → auto-update regardless of count.

12. **Update the review report (Review Iteration Mode only)**

    If running in Review Iteration Mode and the change has `openspec/changes/<name>/review-report.md`:
    - Move addressed findings from `## Artifact Findings` (CRITICAL/WARNING/SUGGESTION sections) into `## Fixes Applied During Review`. Each entry: finding-id, artifact, problem (one line), fix (one line), files touched, verified-by, iteration.
    - Recompute `**Readiness**:` — `READY` if no CRITICAL remains, `NEEDS_REVISION` if WARNING/SUGGESTION remain, `BLOCKED` if CRITICAL still present.
    - Lint: `node scripts/opsx/review-report-lint.mjs openspec/changes/<name>/review-report.md`. Abort on failure.

13. **Show the success summary**

    Display:
    - The modified artifact.
    - Changes applied (one bullet per section).
    - Dependent artifacts updated (with one-line summary).
    - Context-aware next steps based on the scenario detected in step 5.

**Output On Success**

```
## Modification Complete

**Change:** <name>
**Artifact:** <artifact-id>
**Mode:** [Review Iteration / Amendment]

### Changes Applied
- [Section]: [Action] — [Summary]

### Dependent Artifacts Updated
- [x] <artifact-id>: [Summary]

### Next Steps
**Pre-implementation review (Review Iteration Mode):**
- Verify fixes: `/osx:review <name>` (or re-read `review-report.md`)
- Ready to implement: `/opsx:apply <name>` once readiness is `READY`

**Implementation phase (Amendment Mode):**
- Sync changes: `/opsx:apply <name>`
- Check tests: [affected test files if known]
```

**Output On Pause (Ambiguous Input)**

```
## Modification Paused

**Issue:** <description of the ambiguity>

**Options:**
1. <option 1>
2. <option 2>
3. Describe differently
```

**Guardrails**

- Always read the current artifact before modifying.
- Check dependents (`unlocks`) before finalizing changes.
- Use `rules` from instructions for validation, not the CLI `validate` command.
- Use **Edit** for targeted changes, **Write** for complete rewrites.
- Prefer reasonable decisions to keep momentum (0–1 dependents → auto-update).
- Pause and ask for clarification when unable to act autonomously.
- Follow schema order for artifact selection.
- Never copy `context`, `rules`, or `project_context` blocks into artifact files.
- In Review Iteration Mode, always update `review-report.md` to reflect what was fixed (step 12) — silent fixes desync the report from reality.
- Never include Claude attribution in commits or artifacts.
