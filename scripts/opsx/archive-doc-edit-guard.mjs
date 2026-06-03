#!/usr/bin/env node
// @ts-check

/**
 * Guard against silent in-place edits to `openspec/changes/archive/*\/design.md`.
 *
 * Enforces the `dev-tooling` capability requirement "Archived design docs
 * reflect shipped implementation" (openspec/specs/dev-tooling/spec.md): a
 * modification to an archived change's design document is only permitted when
 * an in-flight (un-archived) `openspec/changes/<name>/proposal.md` lists the
 * exact archive path under its `## Impact` section's `**Affected files:**`
 * line.
 *
 * Runs in two positions:
 *   - `.githooks/pre-push` with `--mode=range` (fails the push locally).
 *   - `.github/workflows/archive-doc-guard.yml` with `--mode=range
 *     --base=<pr-base-sha> --head=<pr-head-sha>` (fails CI post-push).
 *
 * There is no bypass flag, env var, commit trailer, or label. Authors who
 * need to edit archived prose legitimately open an OpenSpec change whose
 * proposal.md lists the archive path under `**Affected files:**` and the
 * guard accepts the edit automatically.
 *
 * Usage (programmatic — for tests):
 *   import {
 *     parseDiffLines,
 *     extractImpactSection,
 *     proposalAuthorizesPath,
 *     findAuthorizingProposalForPath,
 *     computeGuardDecision
 *   } from './archive-doc-edit-guard.mjs';
 *
 * Usage (CLI):
 *   node scripts/opsx/archive-doc-edit-guard.mjs               # --mode=staged
 *   node scripts/opsx/archive-doc-edit-guard.mjs --mode=staged
 *   node scripts/opsx/archive-doc-edit-guard.mjs --mode=range --base=<ref> --head=<ref>
 *
 * Exit codes:
 *   0  edit allowed (no archive-design mods, or all mods authorized).
 *   1  edit rejected (unauthorized archive-design modification).
 *   2  internal error (git missing, malformed args, unreadable tree).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const ARCHIVE_DESIGN_PATH_PATTERN = /^openspec\/changes\/archive\/[^/]+\/design\.md$/;
const CHANGES_DIR = join('openspec', 'changes');

// Strip git plumbing env vars from a process.env snapshot.
// When this script runs inside a git hook, git sets GIT_DIR (and potentially
// GIT_WORK_TREE / GIT_INDEX_FILE) in the environment. Every git subprocess
// call already supplies an explicit cwd/repoRoot, so inheriting GIT_DIR would
// override that and redirect operations to the hook's repo rather than the
// intended one. This is critical for the integration tests, which build temp
// repos and call runGuard() with repoRootOverride — the temp repo SHAs are not
// valid in the host repo that GIT_DIR points at.
const { GIT_DIR: _gd, GIT_WORK_TREE: _gwt, GIT_INDEX_FILE: _gif, ...SAFE_ENV } = process.env;
void _gd; void _gwt; void _gif; // intentionally discarded

/**
 * @typedef {object} ParsedDiff
 * @property {string[]} modifiedArchiveDesignPaths
 */

/**
 * @typedef {object} AuthorizingProposal
 * @property {string} changeName
 * @property {string} proposalPath
 */

/**
 * @typedef {object} GuardDecision
 * @property {boolean} allowed
 * @property {string} reason
 * @property {string[]} offendingPaths
 */

/**
 * Extract a modified archive-design path from a single diff row, or null.
 *
 * A row qualifies when: it has exactly two whitespace-separated columns
 * (status + path — rename/copy rows have three), status is `M`, and the
 * path matches `openspec/changes/archive/<name>/design.md`.
 *
 * @param {string} line
 * @returns {string | null}
 */
function extractModifiedArchiveDesignPath(line) {
  const trimmed = line.trimEnd();
  if (trimmed.length === 0) return null;
  const columns = trimmed.split(/\s+/);
  if (columns.length !== 2) return null;
  if (columns[0] !== 'M') return null;
  const path = columns[1];
  return ARCHIVE_DESIGN_PATH_PATTERN.test(path) ? path : null;
}

/**
 * Parse the output of `git diff --name-status --diff-filter=M` (or any
 * `--name-status` output — non-`M` rows are filtered defensively) and return
 * the subset of paths that match an archived change's design.md.
 *
 * Accepts both LF and CRLF line endings. Accepts tab or any whitespace as the
 * status/path separator. Ignores empty lines.
 *
 * Rename/copy rows (`R`/`C`) use a three-column layout (status + src + dst)
 * and are defensively ignored — the diff-filter=M pre-filter should already
 * have removed them, but we guard against a caller passing a wider filter.
 *
 * @param {string} diffOutput
 * @returns {ParsedDiff}
 */
export function parseDiffLines(diffOutput) {
  /** @type {string[]} */
  const modifiedArchiveDesignPaths = [];
  for (const line of diffOutput.split(/\r?\n/)) {
    const path = extractModifiedArchiveDesignPath(line);
    if (path !== null) {
      modifiedArchiveDesignPaths.push(path);
    }
  }
  return { modifiedArchiveDesignPaths };
}

/**
 * Return `true` when `error` is an `ENOENT` filesystem error.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isEnoent(error) {
  return error instanceof Error && /** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT';
}

/**
 * Read a proposal.md and return its contents, or `null` if the file is
 * missing. Any other filesystem error propagates.
 *
 * @param {string} proposalPath
 * @returns {string | null}
 */
function readProposalOrNull(proposalPath) {
  try {
    return readFileSync(proposalPath, 'utf8');
  } catch (error) {
    if (isEnoent(error)) return null;
    throw error;
  }
}

/**
 * Extract the `## Impact` section of a proposal — the substring from the
 * `## Impact` heading up to the next H2-like heading or EOF. Headings are
 * matched at the start of a line, case-sensitive. Returns the empty string
 * when no `## Impact` heading exists.
 *
 * Terminator semantics: a line terminates the section when it begins with
 * `##` followed by any non-`#` character OR end-of-line. That is, `## Title`
 * (space), `##\tTitle` (tab), `##Foo` (malformed no-space heading), and a
 * bare `##` line all terminate; only `### Subsection` and deeper-prefixed
 * headings (`####`, ...) are excluded because their third character is
 * still `#`. The earlier `/^## /` regex required a literal ASCII space and
 * silently leaked `##Foo` body content into the Impact slice, which could
 * falsely authorize an archive edit; `/^##([^#]|$)/` closes that gap
 * without breaking the deliberate `### Subsection` exclusion.
 *
 * The section text is returned WITHOUT the heading line itself, since callers
 * only care about the body content (where `**Affected files:**` lives).
 *
 * @param {string} proposalContents
 * @returns {string}
 */
export function extractImpactSection(proposalContents) {
  const lines = proposalContents.split(/\r?\n/);
  let inImpact = false;
  /** @type {string[]} */
  const collected = [];
  for (const line of lines) {
    if (!inImpact) {
      if (/^## Impact\s*$/.test(line)) {
        inImpact = true;
      }
      continue;
    }
    if (/^##([^#]|$)/.test(line)) {
      break;
    }
    collected.push(line);
  }
  return collected.join('\n');
}

/**
 * Decide whether a proposal authorizes a modification to the given archive
 * path. Authorization requires the `archivePath` to appear as a path-bounded
 * token inside the proposal's `## Impact` section: the matched substring
 * MUST be preceded by either start-of-string or a non-path character
 * (whitespace, `,`, `;`, parens, square brackets, angle brackets, single
 * quote, double quote, backtick) AND followed by either end-of-string or
 * one of the same non-path characters.
 *
 * Adjacent suffix collisions like `design.md.bak`, `design.md/old`, and
 * `design.mdx` MUST NOT authorize an edit to `design.md`. The earlier
 * `String.prototype.includes` matcher accepted any substring and would
 * have authorized those lookalikes; `\b` (word boundary) is the wrong tool
 * because `.` and `/` are already on its non-word side, so it would still
 * accept `design.md.bak` for `design.md`.
 *
 * Mentions of the path elsewhere in the proposal (`## Why`, `## What
 * Changes`, `## Capabilities`) do NOT authorize. The `## Impact` section is
 * the single source of truth because that is the section reviewers scan when
 * accepting a corrective change's blast radius.
 *
 * @param {string} proposalContents
 * @param {string} archivePath
 * @returns {boolean}
 */
export function proposalAuthorizesPath(proposalContents, archivePath) {
  const impact = extractImpactSection(proposalContents);
  // reason: leading group `(^|...)` is intentionally a single consuming
  // alternation rather than a lookbehind. We could write `(?<=^|[<class>])`
  // (lookbehind is fine on Node 20+), but the consuming alternation reads
  // straight left-to-right and `.test()` only checks presence, so the
  // captured boundary char is harmless. The trailing boundary is a `(?=...)`
  // lookahead that includes `$` so a path immediately followed by EOL/EOF
  // still matches without consuming the right-boundary character.
  const escaped = archivePath.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const pattern = new RegExp(
    String.raw`(^|[\s,;()\[\]<>"'` + '`' + String.raw`])` +
      escaped +
      String.raw`(?=$|[\s,;()\[\]<>"'` + '`' + String.raw`])`
  );
  return pattern.test(impact);
}

/**
 * Scan every in-flight change (`openspec/changes/<name>/proposal.md`
 * excluding `openspec/changes/archive/**`) and return the subset whose
 * proposal.md authorizes the given archive path.
 *
 * Returns `[]` when the changes directory does not exist yet (fresh clone
 * with no in-flight changes), which correctly blocks any archive-design
 * modification that attempts to land without a governing change.
 *
 * @param {string} repoRoot
 * @param {string} archivePath
 * @returns {AuthorizingProposal[]}
 */
export function findAuthorizingProposalForPath(repoRoot, archivePath) {
  const changesRoot = join(repoRoot, CHANGES_DIR);
  let entries;
  try {
    entries = readdirSync(changesRoot, { withFileTypes: true });
  } catch (error) {
    if (isEnoent(error)) return [];
    throw error;
  }

  /** @type {AuthorizingProposal[]} */
  const authorizing = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'archive') continue;
    const proposalPath = join(changesRoot, entry.name, 'proposal.md');
    const contents = readProposalOrNull(proposalPath);
    if (contents === null) continue;
    if (!proposalAuthorizesPath(contents, archivePath)) continue;
    authorizing.push({
      changeName: entry.name,
      proposalPath: relative(repoRoot, proposalPath).split(sep).join('/')
    });
  }
  return authorizing;
}

/**
 * Decide whether the guard permits the diff.
 *
 * Short-circuits to `{ allowed: true }` when the diff contains zero
 * archive-design modifications — the hot path (every commit that does not
 * touch the archive pays only the cost of reading the diff).
 *
 * When archive-design modifications exist, the decision is `allowed: true`
 * iff EVERY modified path has at least one authorizing proposal. Even one
 * unauthorized path rejects the entire diff (the offending path is reported
 * in `offendingPaths`).
 *
 * `authorizesPath` is a callback `(archivePath: string) => boolean` so the
 * decision function stays pure (no I/O); production wiring threads
 * `findAuthorizingProposalForPath`, tests can pass a fake.
 *
 * @param {object} input
 * @param {string[]} input.modifiedArchiveDesignPaths
 * @param {(archivePath: string) => boolean} input.authorizesPath
 * @returns {GuardDecision}
 */
export function computeGuardDecision({ modifiedArchiveDesignPaths, authorizesPath }) {
  if (modifiedArchiveDesignPaths.length === 0) {
    return {
      allowed: true,
      reason: 'no archive design.md modifications in diff',
      offendingPaths: []
    };
  }
  const offendingPaths = modifiedArchiveDesignPaths.filter((path) => !authorizesPath(path));
  if (offendingPaths.length === 0) {
    return {
      allowed: true,
      reason: 'every modified archive design.md is authorized by an in-flight proposal',
      offendingPaths: []
    };
  }
  return {
    allowed: false,
    reason:
      `modification to archived design.md requires an in-flight OpenSpec change whose ` +
      `proposal.md lists the archive path under "**Affected files:**" in its "## Impact" ` +
      `section; no such proposal found for the offending path(s)`,
    offendingPaths
  };
}

/**
 * Render a human-readable error message for a rejected decision.
 *
 * The message explicitly states that no bypass mechanism exists.
 *
 * @param {GuardDecision} decision
 * @returns {string}
 */
export function formatRejectionMessage(decision) {
  const lines = [
    '',
    '✗ archive-doc-edit-guard: unauthorized modification to archived design document(s)',
    ''
  ];
  for (const path of decision.offendingPaths) {
    lines.push(`  - ${path}`);
  }
  lines.push(
    '',
    `Reason: ${decision.reason}.`,
    '',
    'The "Archived design docs reflect shipped implementation" requirement',
    '(openspec/specs/dev-tooling/spec.md) forbids silent in-place edits to the',
    'archive directory. A corrective edit to an archived design.md MUST ride',
    'an in-flight OpenSpec change whose proposal.md lists the archive path',
    'under "**Affected files:**" in its "## Impact" section.',
    '',
    'To authorize this edit:',
    '  1. Run /opsx:new <short-name> to open a corrective change.',
    '  2. In the new proposal.md "## Impact" section, list each archive path',
    '     under "**Affected files:**" — e.g.:',
    '       **Affected files:** openspec/changes/archive/<date>-<src>/design.md',
    '  3. Retry the commit.',
    '',
    'There is no --no-verify, environment-variable, or commit-trailer bypass.',
    ''
  );
  return lines.join('\n');
}

/**
 * Shell out to git to read the staged diff (pre-commit path).
 *
 * Uses `--diff-filter=M` so added/deleted/renamed archive entries — the
 * normal output of /opsx:archive — are invisible to the guard.
 *
 * @param {string} repoRoot
 * @returns {string}
 */
function readStagedDiff(repoRoot) {
  return execFileSync('git', ['diff', '--cached', '--name-status', '--diff-filter=M'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: SAFE_ENV
  });
}

/**
 * Shell out to git to read a range diff (CI path).
 *
 * @param {string} repoRoot
 * @param {string} base
 * @param {string} head
 * @returns {string}
 */
function readRangeDiff(repoRoot, base, head) {
  return execFileSync('git', ['diff', '--name-status', '--diff-filter=M', `${base}..${head}`], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: SAFE_ENV
  });
}

/**
 * Resolve the repository root for the current working directory.
 *
 * @returns {string}
 */
function resolveRepoRoot() {
  const output = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
    env: SAFE_ENV
  });
  return output.trim();
}

/**
 * Parse the CLI argv into a structured mode.
 *
 * @param {string[]} argv
 * @returns {{ mode: 'staged' } | { mode: 'range', base: string, head: string }}
 */
export function parseCliArgs(argv) {
  /** @type {Record<string, string>} */
  const opts = { mode: 'staged' };
  for (const arg of argv) {
    const match = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!match) {
      throw new Error(`unrecognized argument: ${arg}`);
    }
    opts[match[1]] = match[2];
  }
  if (opts.mode === 'staged') {
    return { mode: 'staged' };
  }
  if (opts.mode === 'range') {
    if (!opts.base || !opts.head) {
      throw new Error('--mode=range requires --base=<ref> and --head=<ref>');
    }
    return { mode: 'range', base: opts.base, head: opts.head };
  }
  throw new Error(`unknown --mode: ${opts.mode}`);
}

/**
 * End-to-end guard invocation — read the diff, scan proposals, decide.
 *
 * Extracted so tests can invoke it against a tmpdir repo without spawning
 * a separate process.
 *
 * @param {{ mode: 'staged' } | { mode: 'range', base: string, head: string }} modeOpts
 * @param {string} [repoRootOverride]
 * @returns {GuardDecision}
 */
export function runGuard(modeOpts, repoRootOverride) {
  const repoRoot = repoRootOverride ?? resolveRepoRoot();
  const diff =
    modeOpts.mode === 'staged'
      ? readStagedDiff(repoRoot)
      : readRangeDiff(repoRoot, modeOpts.base, modeOpts.head);
  const { modifiedArchiveDesignPaths } = parseDiffLines(diff);
  if (modifiedArchiveDesignPaths.length === 0) {
    return {
      allowed: true,
      reason: 'no archive design.md modifications in diff',
      offendingPaths: []
    };
  }
  return computeGuardDecision({
    modifiedArchiveDesignPaths,
    authorizesPath: (archivePath) => findAuthorizingProposalForPath(repoRoot, archivePath).length > 0
  });
}

// reason: comparing argv[1] (which preserves the symlink path the user typed)
// against import.meta.url (which always resolves to the real file path) means
// invocations through a symlink will read as imports rather than direct runs.
// No symlinks point at this script today, but document the caveat for anyone
// who later wires it via a wrapper or alias.
const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  try {
    const modeOpts = parseCliArgs(process.argv.slice(2));
    const decision = runGuard(modeOpts);
    if (decision.allowed) {
      if (process.env.OPSX_GUARD_VERBOSE === '1') {
        process.stdout.write(`✓ archive-doc-edit-guard: ${decision.reason}\n`);
      }
      process.exit(0);
    }
    process.stderr.write(formatRejectionMessage(decision));
    process.exit(1);
  } catch (error) {
    process.stderr.write(
      `\narchive-doc-edit-guard: internal error — ${
        error instanceof Error ? error.message : String(error)
      }\n\n`
    );
    process.exit(2);
  }
}
