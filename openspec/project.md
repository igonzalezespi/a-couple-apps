# OpenSpec Project Configuration

Project-level configuration for the A Couple Apps OpenSpec workflow. Consumed by
`/opsx:verify` and `/opsx:archive` to tune triage behavior, enforce quality
thresholds, and drive automation decisions.

This file is parsed by `scripts/opsx/project-config.mjs` which expects a single
fenced YAML block labeled `yaml`. Narrative commentary outside the fenced block
is allowed and ignored.

## Configuration

```yaml
verify:
  # Scorecard thresholds evaluated by /opsx:archive before proceeding.
  # If any threshold is breached, archive prompts the user with
  # "Abort / Override this run / Update thresholds".
  thresholds:
    # Minimum fraction of delta-spec requirements that must be mapped to
    # implementation in verify-report.md Correctness dimension.
    requirement_coverage_min: 0.8

    # Minimum fraction of spec scenarios that must be covered by tests,
    # as reported by /osx:verify-tests and embedded in Test Compliance.
    scenario_coverage_min: 0.7

    # When true, /opsx:archive refuses to archive a change that has no
    # verify-report.md (not even a reconstructed one). When false, it
    # treats missing reports as empty and applies the opsx:unverified label.
    block_on_missing_report: false

  # Triage-loop configuration for /opsx:verify auto-fix behavior.
  triage:
    # Maximum number of verify -> auto-fix -> re-verify iterations per run.
    # The loop stops early when CRITICAL == 0 AND the deferred set is
    # stable across two consecutive iterations. Hard cap is 3.
    max_iterations: 3

    # Maximum LoC a single auto-fix may touch across all files. Findings
    # requiring a larger change always defer to /opsx:propose instead.
    auto_fix_max_loc_per_change: 150

    # Rule set used by the triage loop to decide whether a finding is
    # auto-fixable. Keep this list in sync with the verify.md command.
    rules:
      - critical_incomplete_task_with_evidence
      - critical_missing_implementation_single_file_small
      - warning_spec_divergence_code_correct
      - warning_scenario_uncovered_test_file_exists
      - suggestion_pattern_deviation_single_line
      - suggestion_missing_why_comment_small_scope

  # Archive-time behavior.
  archive:
    # When true, /opsx:archive runs `gh issue create` for each Deferred Work
    # entry in verify-report.md and replaces the raw /opsx:propose block in
    # the PR body with the issue URL.
    create_deferred_issues: true

    # When true, /opsx:archive runs `gh issue create` for each Manual Actions
    # Required entry in verify-report.md and renders the PR body's Manual QA
    # Checklist as links to those issues.
    create_manual_action_issues: true

    # When true, /opsx:apply refuses to start implementation until
    # /osx:review has run and reviewedAt is set in .opsx-state.json
    # (or reviewWaived is explicitly true with a reason).
    require_review_before_apply: true

    # Threshold above which /opsx:archive prompts for confirmation before
    # creating the full set of GitHub issues from Deferred Work entries.
    deferred_issue_batch_prompt_threshold: 5

manual_checks:
  # Location of the reusable manual-verification recipe library.
  library_path: openspec/manual-checks

  # When true, /opsx:verify prefers referencing an existing library recipe
  # by ID over inlining steps when the category matches. Manual checks matter
  # here because the apps target iOS/Android/web — visual and device behavior
  # often needs human verification.
  prefer_library_reference: true
```
