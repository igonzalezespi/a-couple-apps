#!/usr/bin/env node
// @ts-check

/**
 * Schema linter for `tasks.md` authoring conventions enforced by the
 * `opsx-change-authoring` capability:
 *
 *   - `TaskListOutOfScopeUsesPlainBullets` — §Out of Scope (and aliases
 *     §Won't Do) MUST use plain `- …` bullets under a non-numbered
 *     `## Out of Scope` heading.
 *   - `OutOfScopeMirrorsNonGoalsOrder` — when both `design.md` §Non-Goals
 *     and `tasks.md` §Out of Scope exist, the two lists MUST enumerate the
 *     same items in the same order.
 *
 * This is the programmatic enforcer codified by Requirement
 * `TasksMdAuthoringLintEnforces` (see
 * `openspec/specs/opsx-change-authoring/spec.md`). It replaces review-time
 * eyeballing for both rules and closes the scenario-coverage gaps logged
 * in verify-reports for the source changes (issues #324 and #332).
 *
 * The lint accepts one or more change directories on argv and emits one
 * finding per drift, one per line:
 *
 *   <change-dir>/tasks.md:<line>: tasks_md_authoring_lint:<rule>: <message>
 *
 * Recognized rules:
 *   - `plain_bullets`     — §Out of Scope bullet uses checkbox syntax.
 *   - `numbered_heading`  — §Out of Scope heading is numbered.
 *   - `order_drift`       — §Out of Scope bullet at position i does not
 *                           match §Non-Goals position i.
 *   - `pairing_failed`    — topic-key extraction cannot one-to-one pair
 *                           the two lists (asymmetric cardinality or
 *                           untyped bullets).
 *
 * Archive immutability: when an argv path resolves under
 * `openspec/changes/archive/**`, the lint exits 0 with a skip line — the
 * `enforce-archived-design-edit-lint` capability remains the authoritative
 * gate against archive edits.
 *
 * Usage (CLI):
 *   node scripts/opsx/lint-tasks-md.mjs <change-dir> [<change-dir> ...]
 *
 * Exit codes:
 *   0 — every change-dir lints clean (or is archive-skipped).
 *   1 — at least one change-dir has findings.
 *   2 — usage error or non-existent change directory.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * @typedef {object} Bullet
 * @property {number} line 1-indexed line number in the source file.
 * @property {string} body The bullet body (text after the `- ` marker), un-stripped.
 * @property {string} topicKey Deterministic lowercase key for pairing.
 */

/**
 * @typedef {object} TasksMdParse
 * @property {{ line: number, numbered: boolean } | null} outOfScopeHeading
 * @property {Bullet[]} outOfScopeBullets
 * @property {Array<{ line: number, body: string }>} checkboxBullets Raw `- [ ] …` / `- [x] …` bullets (with or without an `N.M` numeric prefix) inside §Out of Scope. Empty when the rule passes.
 */

/**
 * @typedef {object} DesignMdParse
 * @property {{ line: number } | null} nonGoalsHeading
 * @property {Bullet[]} nonGoalsBullets
 */

/**
 * @typedef {object} Finding
 * @property {string} file Relative file the finding cites (e.g., `tasks.md` or `design.md`).
 * @property {number} line 1-indexed line number.
 * @property {'plain_bullets' | 'numbered_heading' | 'order_drift' | 'pairing_failed'} rule
 * @property {string} message Single-line human-readable description + recommendation.
 */

const HEADING_LINE = /^##\s+(.+?)\s*$/;
const NUMBERED_HEADING = /^(\d+)\.\s+(.+)$/;
const BULLET_LINE = /^\s*-\s+(.*)$/;
const CHECKBOX_BULLET = /^\s*-\s+\[[\sxX]\]\s+(.*)$/;
const BOLD_LEAD = /^\*\*([^*]+?)\*\*/;
const TASKS_OUT_OF_SCOPE_ALIASES = /** @type {const} */ (['Out of Scope', "Won't Do"]);
const DESIGN_NON_GOALS = 'Non-Goals';
// Some changes nest §Non-Goals under a `## Goals / Non-Goals` H2 with a
// `**Non-Goals:**` bold sub-label rather than a dedicated H2 — common
// across the opsx-change-authoring sibling changes. Recognize both forms.
const DESIGN_NON_GOALS_SUBLABEL = /^\*\*Non-Goals:?\*\*:?$/;
const CROSS_REF_DESIGN = /\bSee\s+design\.md\s+§Non-Goals\b/i;
const CROSS_REF_TASKS = /\bSee\s+tasks\.md\s+§Out of Scope\b/i;
const PUNCT_STRIP = /[.,;:!?()[\]{}"'`*]+/g;
const WHITESPACE = /\s+/g;
// Negation prefixes are stripped so design's "No X" bolded form matches
// tasks' positive "X" one-liner. Both forms describe the same scope-
// boundary item — the "No" is rhetorical framing, not a different topic.
const LEADING_NEGATION = /^(no|don't|do not|won't|will not|never)\s+/;

/**
 * Detect whether a path resolves under `openspec/changes/archive/`. Tolerates
 * leading `./` and trailing slashes. Pure path math — does not stat the
 * filesystem.
 *
 * @param {string} changeDir
 * @returns {boolean}
 */
export function isArchivePath(changeDir) {
  const normalized = changeDir.replace(/\\/g, '/').replace(/\/+$/, '');
  return (
    normalized.includes('/openspec/changes/archive/') ||
    normalized.endsWith('/openspec/changes/archive') ||
    normalized.startsWith('openspec/changes/archive/') ||
    normalized === 'openspec/changes/archive'
  );
}

/**
 * Lowercase + collapse whitespace + strip punctuation. Used to normalize a
 * topic key for case-insensitive substring matching across the two artifacts.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeKey(text) {
  const lower = text.toLowerCase().trim();
  const denied = lower.replace(LEADING_NEGATION, '');
  return denied
    .replace(PUNCT_STRIP, ' ')
    .replace(WHITESPACE, ' ')
    .trim();
}

/**
 * Extract the deterministic topic key for a bullet body. Precedence:
 *   1. Bold lead clause `**…**` followed by `.`, `:`, or end of clause.
 *   2. Lead noun phrase preceding a `See design.md §Non-Goals` or
 *      `See tasks.md §Out of Scope` cross-reference (everything up to the
 *      first `.` before the cross-reference; internal commas are preserved
 *      through to `normalizeKey`, which strips the comma char itself but
 *      keeps both clauses as words in the final topic key).
 *   3. First-sentence fallback (up to the first `.`, `:`, or `\n`).
 *
 * @param {string} body
 * @returns {string}
 */
export function extractTopicKey(body) {
  const trimmed = body.trim();
  if (trimmed.length === 0) return '';

  const boldMatch = BOLD_LEAD.exec(trimmed);
  if (boldMatch) {
    return normalizeKey(boldMatch[1]);
  }

  if (CROSS_REF_DESIGN.test(trimmed) || CROSS_REF_TASKS.test(trimmed)) {
    const beforeRef = trimmed
      .replace(CROSS_REF_DESIGN, '')
      .replace(CROSS_REF_TASKS, '');
    const firstClause = beforeRef.split('.')[0];
    return normalizeKey(firstClause);
  }

  const firstSentence = trimmed.split(/[.:\n]/)[0] ?? trimmed;
  return normalizeKey(firstSentence);
}

/**
 * Collect contiguous bullets immediately after a heading line. A bullet
 * spans one or more lines until the next bullet, the next heading, or a
 * blank-line-followed-by-non-bullet boundary. Returns 1-indexed line
 * numbers for the bullet's first line.
 *
 * @param {string[]} lines
 * @param {number} headingIdx 0-indexed line where the heading lives.
 * @returns {Array<{ line: number, body: string }>}
 */
export function collectBulletsAfterHeading(lines, headingIdx) {
  /** @type {Array<{ line: number, body: string }>} */
  const out = [];
  /** @type {{ line: number, parts: string[] } | null} */
  let current = null;
  let sawBlank = false;
  for (let i = headingIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (HEADING_LINE.test(line)) break;
    const bulletMatch = BULLET_LINE.exec(line);
    if (bulletMatch) {
      if (current) {
        out.push({ line: current.line, body: current.parts.join(' ').trim() });
      }
      current = { line: i + 1, parts: [bulletMatch[1]] };
      sawBlank = false;
      continue;
    }
    if (line.trim() === '') {
      sawBlank = true;
      continue;
    }
    if (current && !sawBlank) {
      current.parts.push(line.trim());
      continue;
    }
    if (sawBlank) break;
  }
  if (current) {
    out.push({ line: current.line, body: current.parts.join(' ').trim() });
  }
  return out;
}

/**
 * Parse `tasks.md` for §Out of Scope (or §Won't Do) heading + bullets,
 * separating plain bullets from checkbox-anti-pattern bullets.
 *
 * @param {string} content
 * @returns {TasksMdParse}
 */
export function parseTasksMd(content) {
  const lines = content.split(/\r?\n/);
  /** @type {{ line: number, numbered: boolean } | null} */
  let heading = null;
  for (let i = 0; i < lines.length; i += 1) {
    const match = HEADING_LINE.exec(lines[i]);
    if (!match) continue;
    const text = match[1];
    const numberedMatch = NUMBERED_HEADING.exec(text);
    const stripped = numberedMatch ? numberedMatch[2] : text;
    if (TASKS_OUT_OF_SCOPE_ALIASES.includes(/** @type {any} */ (stripped))) {
      heading = { line: i + 1, numbered: numberedMatch !== null };
      const rawBullets = collectBulletsAfterHeading(lines, i);
      /** @type {Bullet[]} */
      const plainBullets = [];
      /** @type {Array<{ line: number, body: string }>} */
      const checkboxBullets = [];
      for (const raw of rawBullets) {
        const cbMatch = CHECKBOX_BULLET.exec(`- ${raw.body}`);
        if (cbMatch) {
          checkboxBullets.push(raw);
          continue;
        }
        plainBullets.push({
          line: raw.line,
          body: raw.body,
          topicKey: extractTopicKey(raw.body)
        });
      }
      return { outOfScopeHeading: heading, outOfScopeBullets: plainBullets, checkboxBullets };
    }
  }
  return { outOfScopeHeading: null, outOfScopeBullets: [], checkboxBullets: [] };
}

/**
 * Parse `design.md` for §Non-Goals bullets. Recognizes two conventions:
 * (a) a dedicated `## Non-Goals` H2, or (b) a `**Non-Goals:**` bold
 * sub-label nested under a broader `## Goals / Non-Goals` H2. Returns
 * the bullets after whichever marker matches first.
 *
 * @param {string} content
 * @returns {DesignMdParse}
 */
export function parseDesignMd(content) {
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const match = HEADING_LINE.exec(lines[i]);
    if (match && match[1].trim() === DESIGN_NON_GOALS) {
      const rawBullets = collectBulletsAfterHeading(lines, i);
      const bullets = rawBullets.map((b) => ({
        line: b.line,
        body: b.body,
        topicKey: extractTopicKey(b.body)
      }));
      return { nonGoalsHeading: { line: i + 1 }, nonGoalsBullets: bullets };
    }
  }
  for (let i = 0; i < lines.length; i += 1) {
    if (DESIGN_NON_GOALS_SUBLABEL.test(lines[i].trim())) {
      const rawBullets = collectBulletsAfterHeading(lines, i);
      const bullets = rawBullets.map((b) => ({
        line: b.line,
        body: b.body,
        topicKey: extractTopicKey(b.body)
      }));
      return { nonGoalsHeading: { line: i + 1 }, nonGoalsBullets: bullets };
    }
  }
  return { nonGoalsHeading: null, nonGoalsBullets: [] };
}

/**
 * Check whether two topic keys pair via substring containment (the shorter
 * key appears within the longer key). Empty keys never pair.
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function keysMatch(a, b) {
  if (a.length === 0 || b.length === 0) return false;
  if (a === b) return true;
  return a.length <= b.length ? b.includes(a) : a.includes(b);
}

/**
 * Pair design-side and tasks-side bullets via greedy bipartite matching
 * using substring containment tolerance. Pairing succeeds iff every
 * design-side bullet finds an unused tasks-side partner. The resulting
 * permutation maps design indices to tasks indices (`permutation[i] = j`
 * means design bullet at position `i` matched tasks bullet at position `j`).
 *
 * @param {Bullet[]} designBullets
 * @param {Bullet[]} tasksBullets
 * @returns {{ ok: boolean, mismatchIndex: number | null, permutation: number[] | null }}
 */
export function pairBullets(designBullets, tasksBullets) {
  if (designBullets.length !== tasksBullets.length) {
    return { ok: false, mismatchIndex: null, permutation: null };
  }
  const n = designBullets.length;
  /** @type {boolean[]} */
  const usedTasks = new Array(n).fill(false);
  /** @type {number[]} */
  const permutation = new Array(n).fill(-1);
  // Two-pass matching: exact key first, then substring containment.
  // A pure substring-first scan steals shorter keys (e.g. `lint`) from
  // bullets whose exact partner is later in the list, suppressing drift
  // findings when keys overlap (e.g. `lint` vs `lint enforcement`).
  for (let i = 0; i < n; i += 1) {
    const dKey = designBullets[i].topicKey;
    let matched = -1;
    for (let j = 0; j < n; j += 1) {
      if (usedTasks[j]) continue;
      if (tasksBullets[j].topicKey === dKey) {
        matched = j;
        break;
      }
    }
    if (matched === -1) {
      for (let j = 0; j < n; j += 1) {
        if (usedTasks[j]) continue;
        if (keysMatch(dKey, tasksBullets[j].topicKey)) {
          matched = j;
          break;
        }
      }
    }
    if (matched === -1) {
      return { ok: false, mismatchIndex: i, permutation: null };
    }
    permutation[i] = matched;
    usedTasks[matched] = true;
  }
  return { ok: true, mismatchIndex: null, permutation };
}

/**
 * Find the first design-index whose matched tasks-index differs from it
 * (i.e., the first positional drift). Assumes the input permutation came
 * from a successful `pairBullets` call.
 *
 * @param {number[]} permutation
 * @returns {number | null}
 */
export function findFirstOrderDrift(permutation) {
  for (let i = 0; i < permutation.length; i += 1) {
    if (permutation[i] !== i) return i;
  }
  return null;
}

/**
 * Lint a change directory against both Requirements. Returns an array of
 * findings (empty = clean). Returns `[]` for archive paths.
 *
 * @param {string} changeDir
 * @returns {Finding[]}
 */
export function lintChangeDir(changeDir) {
  if (isArchivePath(changeDir)) return [];

  const tasksPath = join(changeDir, 'tasks.md');
  const designPath = join(changeDir, 'design.md');

  if (!existsSync(tasksPath)) return [];

  const tasksContent = readFileSync(tasksPath, 'utf8');
  const tasks = parseTasksMd(tasksContent);

  /** @type {Finding[]} */
  const findings = [];

  if (tasks.outOfScopeHeading === null) {
    // No §Out of Scope section — both Requirements are inapplicable for
    // formatting, and the mirror rule needs both sections present per
    // `MissingPartnerSectionMakesRuleInapplicable`.
    return findings;
  }

  if (tasks.outOfScopeHeading.numbered) {
    findings.push({
      file: 'tasks.md',
      line: tasks.outOfScopeHeading.line,
      rule: 'numbered_heading',
      message:
        '§Out of Scope heading is numbered (`## N. Out of Scope`); flatten to plain `## Out of Scope` per Requirement `TaskListOutOfScopeUsesPlainBullets`.'
    });
  }

  for (const cb of tasks.checkboxBullets) {
    findings.push({
      file: 'tasks.md',
      line: cb.line,
      rule: 'plain_bullets',
      message:
        '§Out of Scope bullet uses checkbox syntax (`- [ ] …` or `- [x] …`, with or without an `N.M` numeric prefix); replace the prefix with plain `- `, preserving the bullet body. Per Requirement `TaskListOutOfScopeUsesPlainBullets`.'
    });
  }

  if (!existsSync(designPath)) return findings;
  const designContent = readFileSync(designPath, 'utf8');
  const design = parseDesignMd(designContent);

  if (design.nonGoalsHeading === null) return findings;
  if (tasks.outOfScopeBullets.length === 0 && tasks.checkboxBullets.length === 0) {
    return findings;
  }

  const pairing = pairBullets(design.nonGoalsBullets, tasks.outOfScopeBullets);
  if (!pairing.ok) {
    const driftLine =
      pairing.mismatchIndex !== null && tasks.outOfScopeBullets[pairing.mismatchIndex]
        ? tasks.outOfScopeBullets[pairing.mismatchIndex].line
        : tasks.outOfScopeHeading.line;
    const detail =
      design.nonGoalsBullets.length !== tasks.outOfScopeBullets.length
        ? `cardinality mismatch (design.md §Non-Goals: ${design.nonGoalsBullets.length}, tasks.md §Out of Scope: ${tasks.outOfScopeBullets.length})`
        : `untyped or unmatchable bullets at position ${(pairing.mismatchIndex ?? 0) + 1}`;
    findings.push({
      file: 'tasks.md',
      line: driftLine,
      rule: 'pairing_failed',
      message: `cannot one-to-one pair design.md §Non-Goals with tasks.md §Out of Scope — ${detail}. Reconcile cardinality first (split, collapse, or add cross-reference), then re-run. Per Requirement \`OutOfScopeMirrorsNonGoalsOrder\`.`
    });
    return findings;
  }

  if (pairing.permutation === null) return findings;
  const driftIdx = findFirstOrderDrift(pairing.permutation);
  if (driftIdx !== null) {
    const partnerIdx = pairing.permutation[driftIdx];
    const tasksWrong = tasks.outOfScopeBullets[driftIdx];
    const tasksExpected = tasks.outOfScopeBullets[partnerIdx];
    const designBullet = design.nonGoalsBullets[driftIdx];
    findings.push({
      file: 'tasks.md',
      line: tasksWrong.line,
      rule: 'order_drift',
      message: `§Out of Scope position ${driftIdx + 1} has "${tasksWrong.topicKey}" but design.md §Non-Goals position ${driftIdx + 1} (line ${designBullet.line}) expects "${designBullet.topicKey}" — the matching tasks bullet is currently at position ${partnerIdx + 1} (line ${tasksExpected.line}). Reorder tasks.md §Out of Scope to match design.md §Non-Goals; never the reverse. Per Requirement \`OutOfScopeMirrorsNonGoalsOrder\`.`
    });
  }

  return findings;
}

/**
 * Format a Finding as a single CLI output line.
 *
 * @param {string} changeDir
 * @param {Finding} f
 * @returns {string}
 */
export function formatFinding(changeDir, f) {
  return `${changeDir}/${f.file}:${f.line}: tasks_md_authoring_lint:${f.rule}: ${f.message}`;
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write(
      'Usage: node scripts/opsx/lint-tasks-md.mjs <change-dir> [<change-dir> ...]\n'
    );
    process.exit(2);
  }

  let hadFindings = false;
  let hadError = false;
  for (const changeDir of args) {
    if (isArchivePath(changeDir)) {
      process.stdout.write(
        `${changeDir}: skipped (archive immutable per enforce-archived-design-edit-lint)\n`
      );
      continue;
    }
    if (!existsSync(changeDir)) {
      hadError = true;
      process.stderr.write(`✗ ${changeDir}: change directory does not exist\n`);
      continue;
    }
    const findings = lintChangeDir(changeDir);
    if (findings.length === 0) {
      process.stdout.write(`✓ ${changeDir}\n`);
      continue;
    }
    hadFindings = true;
    for (const f of findings) {
      process.stdout.write(`${formatFinding(changeDir, f)}\n`);
    }
  }
  if (hadError) process.exit(2);
  process.exit(hadFindings ? 1 : 0);
}
