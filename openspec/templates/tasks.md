## 1. <!-- Task Group Name -->

- [ ] 1.1 <!-- Task description -->
- [ ] 1.2 <!-- Task description -->

## 2. <!-- Task Group Name -->

- [ ] 2.1 <!-- Task description -->
- [ ] 2.2 <!-- Task description -->

<!--
  CONVENTION — scope guardrails (e.g. "## Out of Scope", "## Non-Goals")
  use PLAIN BULLETS, never checkboxes.

  Trackable work units (the items above, under numbered "## N." headings)
  use `- [ ] N.M …` checkbox syntax because the /opsx:apply runner counts
  those boxes to compute apply-time progress.

  Scope guardrails are declarative invariants the change commits to
  honoring (e.g. "no production code changes in this change"), not work
  units. Authoring them as `- [ ] N.M …` conflates progress tracking
  with policy declaration and inflates the apply counter with items that
  are never "done" in any meaningful sense — they are commitments NOT to
  do work outside the declared envelope.

  Correct form for a guardrail section (un-numbered heading, plain
  bullets):

      ## Out of Scope

      - Automated lint enforcement (deferred to a follow-up change).
      - Retroactive reformatting of archived `tasks.md` files (immutable
        per `enforce-archived-design-edit-lint`).

  Anti-pattern (do NOT do this):

      ## 4. Out of Scope

      - [ ] 4.1 No production code changes in this change.
      - [ ] 4.2 No widget or integration tests.

  ORDERING — when your change has a `design.md` §Non-Goals section,
  mirror its bullet order in the §Out of Scope list below. The
  `design.md` §Non-Goals list is the canonical source; reorder the
  §Out of Scope bullets to match it, never the reverse. See spec
  `opsx-change-authoring` Requirement `OutOfScopeMirrorsNonGoalsOrder`.

  Mirrored-pair example (matching order across the two files):

      # design.md
      ## Non-Goals
      - **No automated lint.** Deferred until the convention settles.
      - **No retroactive archive edits.** Archive is immutable.

      # tasks.md
      ## Out of Scope
      - Automated lint enforcement. See design.md §Non-Goals.
      - Retroactive reformatting of archived files. See design.md §Non-Goals.

  Canonical wording lives in `openspec/specs/opsx-change-authoring/spec.md`
  (Requirements `TaskListOutOfScopeUsesPlainBullets` and
  `OutOfScopeMirrorsNonGoalsOrder`).
-->
