# Review Report: <change-name>

<!--
  Canonical template for openspec/changes/<name>/review-report.md.
  Produced by /opsx:apply pre-apply review gate (auto-invoked /osx:review).
  Rides the change directory into the archive with everything else.

  Schema is STRICT — heading order, depth, and names are parsed mechanically
  by scripts/opsx/review-report-lint.mjs (a self-contained linter with its
  own required H2/H3 lists, NOT the verify-report parser). Do not rename,
  reorder, or omit H2 sections. Do not alter H3 sub-sections under
  "Artifact Findings". Empty sections MUST render as the literal "_None_".

  Linter: `pnpm opsx:review-report:lint <path>` — fails non-zero on schema
  deviation.
-->

**Change**: `<change-name>`
**Reviewed**: `YYYY-MM-DDTHH:MM:SSZ`
**Readiness**: `READY | NEEDS_REVISION | BLOCKED`
**Schema**: `spec-driven`
**Waived**: `false`

## Scorecard

| Artifact | Completeness | Quality | Notes |
| -------- | ------------ | ------- | ----- |
| proposal | —            | —       |       |
| design   | —            | —       |       |
| specs    | —            | —       |       |
| tasks    | —            | —       |       |

## Artifact Findings

### CRITICAL

_None_

<!--
  Each entry format:

  - **[<finding-id>]** <short title> — `<artifact>:<heading>`
    - **Artifact**: proposal | design | specs | tasks
    - **Kind**: vague_requirement | missing_scenario | undefined_term | conflicting_decision | ambiguous_task | ...
    - **Detail**: 1–3 sentences describing what is wrong.
    - **Recommendation**: specific, actionable fix with file/line references.
    - **Auto-fix eligible**: yes | no (reason)
-->

### WARNING

_None_

### SUGGESTION

_None_

## Fixes Applied During Review

_None_

<!--
  Same format as verify-report "Fixes Applied During Verify". Populated when
  /osx:modify is auto-invoked on CRITICAL review findings during the apply
  gate. Each entry records finding-id, artifact, problem, fix, files touched,
  verified-by, iteration.
-->

## Deferred Artifact Work

_None_

<!--
  Each entry format — a ready-to-run /osx:modify block that the user can
  copy-paste in a future session if triage is not auto-applied.

  ### Deferred <N>: <short title>

  - **Origin**: WARNING | SUGGESTION from <artifact> / <kind>
  - **Finding ID**: <finding-id>
  - **Why deferred**: too large | out of scope | needs judgment | ...
  - **Affected artifacts**: `proposal.md`, `specs/<cap>/spec.md`

  **Modify command**:

  ```
  /osx:modify <change-name>
  > <1–3 sentence description>
  ```
-->

## Readiness

_Placeholder until /osx:review completes._

<!--
  One-paragraph verdict:

  - READY — all artifacts are complete, consistent, and actionable. /opsx:apply
    may proceed.
  - NEEDS_REVISION — WARNING / SUGGESTION findings should be addressed before
    implementation begins, but apply may proceed if the user waives them.
  - BLOCKED — at least one CRITICAL finding requires /osx:modify before apply
    can proceed. /opsx:apply refuses to start implementation.
-->

## Next Step

_Placeholder until /osx:review completes._

<!--
  Explicit next action. Examples:

  - "Run /opsx:apply <name> to start implementation."
  - "Run /osx:modify <name> to address 2 CRITICAL findings before re-running /opsx:apply."
  - "Re-run /osx:review after resolving the blocking findings."
-->
