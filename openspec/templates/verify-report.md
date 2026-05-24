# Verify Report: <change-name>

<!--
  Canonical template for openspec/changes/<name>/verify-report.md.
  Produced by /opsx:verify. Consumed by /opsx:archive. Rides the change
  directory into openspec/changes/archive/YYYY-MM-DD-<name>/ on archive.

  Schema is STRICT. Heading order, heading depth, and section names
  are parsed mechanically by scripts/opsx/verify-report-parser.ts.
  Do not rename, reorder, or omit H2 sections. Do not alter H3 sub-sections
  under "Findings". Empty sections MUST render as the literal "_None_".

  Linter: `pnpm opsx:verify-report:lint <path>` — fails non-zero on
  any schema deviation, including missing/extra sections or out-of-order
  headings.
-->

**Change**: `<change-name>`
**Verified**: `YYYY-MM-DDTHH:MM:SSZ`
**Status**: `READY | READY_WITH_WARNINGS | BLOCKED | BLOCKED_LOOP | RECONSTRUCTED`
**Schema**: `spec-driven`
**Iterations**: `N`
**Dry Run**: `false`

## Scorecard

| Dimension    | Metric                      | Value            | Threshold |
| ------------ | --------------------------- | ---------------- | --------- |
| Completeness | Tasks complete              | `X/Y`            | —         |
| Completeness | Requirements covered        | `N/M`            | `≥ 0.80`  |
| Correctness  | Scenarios covered by tests  | `K/L`            | `≥ 0.70`  |
| Correctness  | Requirements mapped to code | `N/M`            | —         |
| Coherence    | Design decisions followed   | `Y/N/partial`    | —         |
| Coherence    | Pattern consistency         | `aligned/issues` | —         |

## Findings

### CRITICAL

_None_

<!--
  Each entry format:

  - **[<finding-id>]** <short title> — `<file>:<lines>`
    - **Dimension**: completeness | correctness | coherence
    - **Kind**: incomplete_task | missing_requirement_implementation | spec_divergence | scenario_uncovered | pattern_deviation | missing_comment_why | ...
    - **Detail**: 1–3 sentences describing what is wrong and why it is CRITICAL.
    - **Recommendation**: specific, actionable fix with file/line references.
    - **Auto-fix eligible**: yes | no (with reason if no)
-->

### WARNING

_None_

<!--
  Same format as CRITICAL, but findings that "should" be fixed — not
  blockers. Auto-fixed when eligible rules match; otherwise deferred.
-->

### SUGGESTION

_None_

<!--
  Same format as CRITICAL/WARNING. Nice-to-haves. Trivially small
  auto-fixes (single-line, lint-fixable, ≤5-line why-comments) apply
  inline; everything else defers.
-->

## Fixes Applied During Verify

_None_

<!--
  Each entry format:

  - **[<finding-id>]** <short title>
    - **Originally**: CRITICAL | WARNING | SUGGESTION
    - **Dimension / Kind**: <dimension> / <kind>
    - **Problem**: 1–2 sentences describing the original issue.
    - **Fix applied**: 1–2 sentences describing what changed.
    - **Files touched**: `path/to/file.ts:L12-L34`, `path/to/other.md:L1`
    - **Verified by**: re-verify run | test run | lint | manual-replay
    - **Iteration**: N (which triage iteration applied this fix)
-->

## Deferred Work

_None_

<!--
  Each entry format — must include a ready-to-run /opsx:propose block.
  /opsx:archive replaces the fenced command block with the GitHub issue URL
  after running `gh issue create`.

  ### Deferred <N>: <short title>

  - **Origin**: WARNING | SUGGESTION from <dimension> / <kind>
  - **Finding ID**: <finding-id>
  - **Why deferred**: too large | out of scope | needs design | blocked on external | requires human judgment
  - **Affected files**: `path/a.ts`, `path/b.md`

  **Propose command**:

  ```
  /opsx:propose <suggested-kebab-name>
  > <1–3 sentence description of what to change, why, and which files are affected>
  ```
-->

## Manual Actions Required

_None_

<!--
  Each entry format. Prefer referencing a manual-check library recipe
  by ID; only inline steps when no recipe matches.

  ### Manual <N>: <short title>

  - **Category**: visual | third-party | environment | secrets | human-judgment | hardware
  - **Finding ID**: <finding-id>
  - **Why agent cannot verify**: 1–2 sentences.
  - **Recipe**: [<id>](../manual-checks/<id>.md)   _(if a library recipe applies)_
  - **Context**: optional 1-sentence per-occurrence note.
  - **Steps** _(only when no recipe applies)_:
    1. …
    2. …
  - **Pass criteria**: explicit observable outcome.
  - **Owner**: human
-->

## Spec Drift Resolutions

_None_

<!--
  Each entry format — records cases where code was correct and the
  delta spec was updated to match reality.

  - **[<finding-id>]** <requirement name>
    - **Drift**: what the spec said vs what the code did.
    - **Resolution**: delta spec updated at `openspec/changes/<name>/specs/<cap>/spec.md:L?-L?`.
    - **Iteration**: N
-->

## Test Compliance

Placeholder until the first verify run populates this section with the osx-review-test-compliance output. When there are no test files for the change, this section renders the literal string: "No test files found for this change. Coverage analysis skipped." The linter rejects the bare `_None_` sentinel here because Test Compliance is load-bearing and must always carry an explicit message.

<!--
  Populated from /osx:verify-tests. Contains:

  **Summary**: <N> scenarios extracted, <K> tests discovered,
               <H> high-confidence matches, <M> medium, <L> low,
               <O> orphan tests, <G> gaps.

  **Per-scenario table**:

  | Requirement | Scenario | Coverage | Matching Test | Confidence | Notes |
  |-------------|----------|----------|---------------|------------|-------|
  | <req>       | <name>   | covered  | path:line     | high       | —     |

  **Orphan tests**: list of tests that do not match any scenario.

  **Gaps**: list of scenarios with no matching test, plus severity.
-->

## Final Assessment

_Placeholder until the first verify run populates this section._

<!--
  One-paragraph verdict. Examples:

  - "All checks passed. 0 CRITICAL, 0 WARNING, 0 SUGGESTION. Ready for archive."
  - "0 CRITICAL, 2 WARNING (deferred), 1 Manual Action (needs:manual-qa label).
     READY_WITH_WARNINGS. Safe to archive once manual checks are acknowledged."
  - "1 CRITICAL requirement unimplemented (finding id a1b2c3d4). Auto-fix not
     eligible (cross-file refactor). BLOCKED until resolved manually."
  - "Reconstructed by /osx:backfill-verify. Predates the verify-report artifact.
     No findings derivable from archive contents. RECONSTRUCTED."
-->
