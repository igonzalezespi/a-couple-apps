#!/usr/bin/env node
// @ts-check

/**
 * Post-archive safety check — verify it is safe to remove a feature
 * worktree after `/opsx:archive` has completed.
 *
 * Runs a sequence of local + remote assertions:
 *
 *   1. Working tree is clean (no uncommitted/untracked files).
 *   2. No stashes reference the current branch.
 *   3. Current branch has an upstream configured.
 *   4. `@{u}..HEAD` is empty (all commits pushed).
 *   5. `openspec/changes/<name>/` does not exist (archive move succeeded).
 *   6. `openspec/changes/archive/*-<name>/.opsx-state.json` lifecycle is
 *      `archived` with non-null `archivedAt`, `prUrl`, `prNumber`.
 *   7. The GitHub PR referenced by state is OPEN or MERGED, mergeable,
 *      and the status-check rollup shows no FAILURE.
 *   8. Every `deferredIssues[].number` resolves via `gh issue view`.
 *
 * Exit codes:
 *   0 — all checks passed; safe to `git worktree remove`.
 *   1 — at least one blocker; worktree must NOT be removed yet.
 *   2 — warnings only (e.g. `gh` not authenticated, PR check pending).
 *   3 — usage/invocation error.
 *
 * Usage (CLI):
 *   node scripts/opsx/post-archive-safety-check.mjs <name-or-archive-dir> [--json] [--skip-gh]
 *   pnpm opsx:safe-to-remove add-auth
 *
 * Flags:
 *   --json       Emit a single JSON object to stdout (machine-readable).
 *   --skip-gh    Skip GitHub checks (offline mode). Still fails on missing prUrl.
 *   --repo-root  Override the repo root (defaults to `git rev-parse --show-toplevel`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { readState } from './state.mjs';

const ARCHIVE_DIR_RE = /^\d{4}-\d{2}-\d{2}-(.+)$/;
const CLAUDE_WORKTREE_PREFIX = '.claude/worktrees/';
const CLAUDE_WORKTREE_DIR = '.claude/worktrees';

/**
 * @typedef {object} CheckResult
 * @property {'pass' | 'fail' | 'warn' | 'skip'} status
 * @property {string} name
 * @property {string} message
 * @property {Record<string, unknown>} [details]
 */

/**
 * @typedef {object} SafetyCheckReport
 * @property {'safe' | 'blocked' | 'warn'} verdict
 * @property {string} changeName
 * @property {string | null} archiveDir
 * @property {string} branch
 * @property {string} repoRoot
 * @property {CheckResult[]} checks
 */

/**
 * Run a git command, return stdout (trimmed). Non-zero exit throws.
 *
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`git ${args.join(' ')} → exit ${result.status}: ${stderr}`);
  }
  return (result.stdout || '').trim();
}

/**
 * Run gh with JSON output. Returns parsed JSON or throws.
 *
 * @param {string[]} args
 * @param {string} cwd
 * @returns {unknown}
 */
function ghJson(args, cwd) {
  const result = spawnSync('gh', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`gh ${args.join(' ')} → exit ${result.status}: ${stderr}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `gh ${args.join(' ')} returned non-JSON output: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
}

/**
 * Locate the archive directory for a change. Accepts either the raw
 * change name or a full absolute/relative path.
 *
 * @param {string} repoRoot
 * @param {string} input
 * @returns {{ archiveDir: string, changeName: string }}
 */
export function resolveArchiveDir(repoRoot, input) {
  if (!input) throw new Error('missing change name or archive dir');

  const absCandidate = isAbsolute(input) ? input : resolve(repoRoot, input);
  if (existsSync(join(absCandidate, '.opsx-state.json'))) {
    const baseName = basename(absCandidate);
    const match = baseName.match(ARCHIVE_DIR_RE);
    const changeName = match ? match[1] : baseName;
    return { archiveDir: absCandidate, changeName };
  }

  const archiveRoot = join(repoRoot, 'openspec', 'changes', 'archive');
  if (!existsSync(archiveRoot)) {
    throw new Error(`archive root missing: ${archiveRoot}`);
  }
  const matches = readdirSync(archiveRoot).filter((entry) => {
    const m = entry.match(ARCHIVE_DIR_RE);
    return m !== null && m[1] === input;
  });
  if (matches.length === 0) {
    throw new Error(`no archived change matches name "${input}" under ${archiveRoot}`);
  }
  if (matches.length > 1) {
    throw new Error(
      `ambiguous change name "${input}" — multiple archives match: ${matches.join(', ')}`
    );
  }
  return { archiveDir: join(archiveRoot, matches[0]), changeName: input };
}

/**
 * Strip a porcelain v1 status prefix (`XY ` — two status codes plus a
 * space) and surrounding quotes from a single line.
 *
 * @param {string} line
 * @returns {string[]} one entry per path (two for renames `src -> dst`)
 */
function porcelainPaths(line) {
  const raw = line.slice(3);
  const segments = raw.split(' -> ');
  return segments.map((seg) =>
    seg.startsWith('"') && seg.endsWith('"') ? seg.slice(1, -1) : seg
  );
}

/**
 * Claude Code creates per-session checkouts under `.claude/worktrees/`.
 * Those are independent git worktrees and never represent uncommitted
 * work in the calling repo — filter them out so the safety check does
 * not block on unrelated harness state.
 *
 * @param {string} line porcelain v1 status line
 * @returns {boolean}
 */
function isClaudeWorktreeArtifact(line) {
  const paths = porcelainPaths(line);
  if (paths.length === 0) return false;
  return paths.every(
    (path) => path === CLAUDE_WORKTREE_DIR || path.startsWith(CLAUDE_WORKTREE_PREFIX)
  );
}

/**
 * @param {string} repoRoot
 * @returns {CheckResult}
 */
export function checkWorkingTreeClean(repoRoot) {
  const output = git(['status', '--porcelain'], repoRoot);
  if (output.length === 0) {
    return { status: 'pass', name: 'working tree clean', message: 'no uncommitted changes' };
  }
  const allLines = output.split('\n').filter(Boolean);
  const lines = allLines.filter((line) => !isClaudeWorktreeArtifact(line));
  if (lines.length === 0) {
    const ignored = allLines.length;
    return {
      status: 'pass',
      name: 'working tree clean',
      message: `no uncommitted changes (ignored ${ignored} Claude Code worktree entry/entries)`
    };
  }
  return {
    status: 'fail',
    name: 'working tree clean',
    message: `${lines.length} uncommitted / untracked path(s)`,
    details: { entries: lines }
  };
}

/**
 * @param {string} repoRoot
 * @param {string} branch
 * @returns {CheckResult}
 */
export function checkStashes(repoRoot, branch) {
  const output = git(['stash', 'list'], repoRoot);
  if (output.length === 0) {
    return { status: 'pass', name: 'no orphan stashes', message: 'stash list is empty' };
  }
  const lines = output.split('\n').filter(Boolean);
  // eslint-disable-next-line security/detect-non-literal-regexp -- branch name is escaped via escapeRegex; no injection path from git rev-parse output
  const needle = new RegExp(`\\b(?:On|WIP on) ${escapeRegex(branch)}[:\\s]`);
  const matching = lines.filter((line) => needle.test(line));
  if (matching.length === 0) {
    return {
      status: 'warn',
      name: 'no orphan stashes',
      message: `${lines.length} stash(es) exist but none reference ${branch}`,
      details: { totalStashes: lines.length }
    };
  }
  return {
    status: 'fail',
    name: 'no orphan stashes',
    message: `${matching.length} stash(es) reference branch ${branch}`,
    details: { stashes: matching }
  };
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} repoRoot
 * @param {string} branch
 * @returns {CheckResult}
 */
export function checkUpstream(repoRoot, branch) {
  try {
    const remote = git(['config', '--get', `branch.${branch}.remote`], repoRoot);
    if (remote.length === 0) {
      return {
        status: 'fail',
        name: 'upstream tracking',
        message: `branch ${branch} has no upstream — push with git push -u origin ${branch}`
      };
    }
    const merge = git(['config', '--get', `branch.${branch}.merge`], repoRoot);
    return {
      status: 'pass',
      name: 'upstream tracking',
      message: `tracking ${remote}/${merge.replace('refs/heads/', '')}`
    };
  } catch {
    return {
      status: 'fail',
      name: 'upstream tracking',
      message: `branch ${branch} has no upstream — push with git push -u origin ${branch}`
    };
  }
}

/**
 * @param {string} repoRoot
 * @returns {CheckResult}
 */
export function checkAllPushed(repoRoot) {
  try {
    const unpushed = git(['log', '--oneline', '@{u}..HEAD'], repoRoot);
    if (unpushed.length === 0) {
      return { status: 'pass', name: 'all commits pushed', message: 'local matches upstream' };
    }
    const commits = unpushed.split('\n').filter(Boolean);
    return {
      status: 'fail',
      name: 'all commits pushed',
      message: `${commits.length} commit(s) not pushed to upstream`,
      details: { commits }
    };
  } catch (error) {
    return {
      status: 'fail',
      name: 'all commits pushed',
      message: `cannot compare with upstream: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * @param {string} repoRoot
 * @param {string} changeName
 * @returns {CheckResult}
 */
export function checkChangeMoved(repoRoot, changeName) {
  const livePath = join(repoRoot, 'openspec', 'changes', changeName);
  if (existsSync(livePath)) {
    return {
      status: 'fail',
      name: 'change moved to archive',
      message: `openspec/changes/${changeName}/ still exists — archive move did not happen`,
      details: { path: livePath }
    };
  }
  return {
    status: 'pass',
    name: 'change moved to archive',
    message: `openspec/changes/${changeName}/ is gone (archived)`
  };
}

/**
 * @param {string} archiveDir
 * @returns {{ check: CheckResult, state: import('./state.mjs').OpsxState | null }}
 */
export function checkStateArchived(archiveDir) {
  let state;
  try {
    state = readState(archiveDir);
  } catch (error) {
    return {
      state: null,
      check: {
        status: 'fail',
        name: 'state lifecycle = archived',
        message: `cannot read .opsx-state.json: ${error instanceof Error ? error.message : String(error)}`
      }
    };
  }
  if (!state) {
    return {
      state: null,
      check: {
        status: 'fail',
        name: 'state lifecycle = archived',
        message: `.opsx-state.json missing in ${archiveDir}`
      }
    };
  }
  const missing = [];
  if (!state.archivedAt) missing.push('archivedAt');
  if (!state.prUrl) missing.push('prUrl');
  if (!state.prNumber) missing.push('prNumber');
  if (missing.length > 0) {
    return {
      state,
      check: {
        status: 'fail',
        name: 'state lifecycle = archived',
        message: `state file missing fields: ${missing.join(', ')}`,
        details: { archivedAt: state.archivedAt, prUrl: state.prUrl, prNumber: state.prNumber }
      }
    };
  }
  return {
    state,
    check: {
      status: 'pass',
      name: 'state lifecycle = archived',
      message: `archived ${state.archivedAt}, PR #${state.prNumber}`
    }
  };
}

/**
 * @param {number} prNumber
 * @param {string} repoRoot
 * @returns {CheckResult}
 */
export function checkPrHealth(prNumber, repoRoot) {
  let pr;
  try {
    pr = /** @type {Record<string, unknown>} */ (
      ghJson(
        [
          'pr',
          'view',
          String(prNumber),
          '--json',
          'state,mergeable,mergeStateStatus,statusCheckRollup,isDraft,url'
        ],
        repoRoot
      )
    );
  } catch (error) {
    return {
      status: 'warn',
      name: 'PR health',
      message: `cannot query PR #${prNumber}: ${error instanceof Error ? error.message : String(error)}`
    };
  }

  const state = String(pr.state || 'UNKNOWN');
  const mergeable = String(pr.mergeable || 'UNKNOWN');
  const rollup = Array.isArray(pr.statusCheckRollup) ? pr.statusCheckRollup : [];
  const failed = rollup.filter((check) => {
    const c = /** @type {Record<string, unknown>} */ (check);
    const conclusion = String(c.conclusion || '').toUpperCase();
    const checkState = String(c.state || '').toUpperCase();
    return conclusion === 'FAILURE' || conclusion === 'CANCELLED' || checkState === 'FAILURE';
  });
  const pending = rollup.filter((check) => {
    const c = /** @type {Record<string, unknown>} */ (check);
    const conclusion = String(c.conclusion || '').toUpperCase();
    const checkState = String(c.state || '').toUpperCase();
    return (
      conclusion === '' ||
      conclusion === 'PENDING' ||
      checkState === 'PENDING' ||
      checkState === 'IN_PROGRESS'
    );
  });

  if (state === 'CLOSED') {
    return {
      status: 'fail',
      name: 'PR health',
      message: `PR #${prNumber} is CLOSED without merge`,
      details: { state, url: pr.url }
    };
  }

  if (failed.length > 0) {
    return {
      status: 'fail',
      name: 'PR health',
      message: `PR #${prNumber}: ${failed.length} failed check(s)`,
      details: {
        state,
        mergeable,
        failedChecks: failed.map((c) => /** @type {Record<string, unknown>} */ (c).name)
      }
    };
  }

  if (state === 'MERGED') {
    return {
      status: 'pass',
      name: 'PR health',
      message: `PR #${prNumber} MERGED`,
      details: { state, url: pr.url }
    };
  }

  if (mergeable === 'CONFLICTING') {
    return {
      status: 'fail',
      name: 'PR health',
      message: `PR #${prNumber} has merge conflicts`,
      details: { state, mergeable, url: pr.url }
    };
  }

  if (pending.length > 0) {
    return {
      status: 'warn',
      name: 'PR health',
      message: `PR #${prNumber} OPEN, ${pending.length} check(s) still running`,
      details: { state, mergeable, pendingChecks: pending.length, url: pr.url }
    };
  }

  return {
    status: 'pass',
    name: 'PR health',
    message: `PR #${prNumber} ${state}, mergeable=${mergeable}, checks green`,
    details: { state, mergeable, url: pr.url }
  };
}

/**
 * @param {import('./state.mjs').OpsxState} state
 * @param {string} repoRoot
 * @returns {CheckResult}
 */
export function checkDeferredIssues(state, repoRoot) {
  if (!state.deferredIssues || state.deferredIssues.length === 0) {
    return {
      status: 'pass',
      name: 'deferred issues reachable',
      message: 'no deferred issues recorded'
    };
  }
  /** @type {string[]} */
  const missing = [];
  for (const entry of state.deferredIssues) {
    try {
      ghJson(['issue', 'view', String(entry.number), '--json', 'number'], repoRoot);
    } catch {
      missing.push(`#${entry.number}`);
    }
  }
  if (missing.length > 0) {
    return {
      status: 'fail',
      name: 'deferred issues reachable',
      message: `${missing.length} deferred issue(s) unreachable: ${missing.join(', ')}`,
      details: { missing }
    };
  }
  return {
    status: 'pass',
    name: 'deferred issues reachable',
    message: `${state.deferredIssues.length} issue(s) reachable`
  };
}

/**
 * Orchestrator — runs every check and aggregates the verdict.
 *
 * @param {object} opts
 * @param {string} opts.repoRoot
 * @param {string} opts.input
 * @param {boolean} [opts.skipGh]
 * @returns {SafetyCheckReport}
 */
export function runSafetyCheck({ repoRoot, input, skipGh = false }) {
  const { archiveDir, changeName } = resolveArchiveDir(repoRoot, input);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot);

  /** @type {CheckResult[]} */
  const checks = [];
  checks.push(checkWorkingTreeClean(repoRoot));
  checks.push(checkStashes(repoRoot, branch));
  const upstreamResult = checkUpstream(repoRoot, branch);
  checks.push(upstreamResult);
  if (upstreamResult.status === 'pass') {
    checks.push(checkAllPushed(repoRoot));
  } else {
    checks.push({
      status: 'skip',
      name: 'all commits pushed',
      message: 'skipped — no upstream to compare against'
    });
  }
  checks.push(checkChangeMoved(repoRoot, changeName));
  const stateResult = checkStateArchived(archiveDir);
  checks.push(stateResult.check);

  if (skipGh) {
    checks.push({ status: 'skip', name: 'PR health', message: 'skipped (--skip-gh)' });
    checks.push({
      status: 'skip',
      name: 'deferred issues reachable',
      message: 'skipped (--skip-gh)'
    });
  } else if (stateResult.state && stateResult.state.prNumber) {
    checks.push(checkPrHealth(stateResult.state.prNumber, repoRoot));
    checks.push(checkDeferredIssues(stateResult.state, repoRoot));
  } else {
    checks.push({
      status: 'skip',
      name: 'PR health',
      message: 'skipped — no prNumber in state'
    });
    checks.push({
      status: 'skip',
      name: 'deferred issues reachable',
      message: 'skipped — no prNumber in state'
    });
  }

  /** @type {'safe' | 'blocked' | 'warn'} */
  let verdict = 'safe';
  for (const check of checks) {
    if (check.status === 'fail') {
      verdict = 'blocked';
      break;
    }
    if (check.status === 'warn') verdict = 'warn';
  }

  return { verdict, changeName, archiveDir, branch, repoRoot, checks };
}

const STATUS_GLYPH = /** @type {const} */ ({
  pass: '✓',
  fail: '✗',
  warn: '!',
  skip: '·'
});

const VERDICT_LABEL = /** @type {const} */ ({
  safe: 'SAFE TO REMOVE WORKTREE',
  warn: 'SAFE WITH WARNINGS — review above before removing',
  blocked: 'BLOCKED — do NOT remove worktree yet'
});

const VERDICT_EXIT_CODE = /** @type {const} */ ({ safe: 0, warn: 2, blocked: 1 });

/**
 * @param {SafetyCheckReport} report
 * @returns {string}
 */
export function formatReport(report) {
  const lines = [];
  lines.push(`Post-Archive Safety Check — ${report.changeName}`);
  lines.push(`Branch: ${report.branch}`);
  lines.push(`Archive: ${report.archiveDir}`);
  lines.push('─'.repeat(60));
  for (const check of report.checks) {
    const glyph = STATUS_GLYPH[check.status] ?? '·';
    lines.push(`${glyph} ${check.name}: ${check.message}`);
  }
  lines.push('─'.repeat(60));
  lines.push(`Verdict: ${VERDICT_LABEL[report.verdict]}`);
  return lines.join('\n');
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  /** @type {string | null} */
  let input = null;
  let json = false;
  let skipGh = false;
  /** @type {string | null} */
  let repoRootOverride = null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') json = true;
    else if (arg === '--skip-gh') skipGh = true;
    else if (arg === '--repo-root') {
      repoRootOverride = args[i + 1];
      i += 1;
    } else if (arg.startsWith('--')) {
      process.stderr.write(`unknown flag: ${arg}\n`);
      process.exit(3);
    } else if (input === null) {
      input = arg;
    }
  }

  if (input === null) {
    process.stderr.write(
      'Usage: node scripts/opsx/post-archive-safety-check.mjs <change-name-or-archive-dir> [--json] [--skip-gh]\n'
    );
    process.exit(3);
  }

  let repoRoot = repoRootOverride;
  if (!repoRoot) {
    try {
      repoRoot = git(['rev-parse', '--show-toplevel'], process.cwd());
    } catch (error) {
      process.stderr.write(
        `cannot determine repo root: ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exit(3);
    }
  }

  try {
    const report = runSafetyCheck({ repoRoot, input, skipGh });
    if (json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(`${formatReport(report)}\n`);
    }
    process.exit(VERDICT_EXIT_CODE[report.verdict]);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(3);
  }
}
