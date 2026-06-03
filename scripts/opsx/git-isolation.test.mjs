// @ts-check

/**
 * Regression guard: verifies that running the opsx test suite leaves the
 * host repository's git state completely unchanged.
 *
 * Root cause context
 * ------------------
 * When git plumbing variables (GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE) are
 * set in the environment — as a Claude Code agent session may do — any git
 * subprocess that inherits `process.env` without stripping those vars will
 * operate on the repo they point at, ignoring `cwd`. This caused `git init`,
 * `git config`, and `git commit` in fixture builders to silently target the
 * real working repo, corrupting its `.git/config` and appending spurious
 * commits to feature branches.
 *
 * What this guard checks
 * ----------------------
 * 1. `core.bare` is not set (or is false) in the local git config — a
 *    `git init --bare` leak sets it to true.
 * 2. The git user identity (user.email, user.name) in the local config does
 *    not contain the fixture sentinel values.
 * 3. No new commits appear on HEAD that carry the fixture commit messages
 *    ("base", "head") authored by the fixture identity.
 *
 * This file is picked up by `pnpm test:opsx` via `node --test scripts/opsx/*.test.mjs`.
 * It intentionally runs AFTER the other test files (alphabetical order puts
 * git-isolation after archive-doc-edit-guard) so it catches any leak.
 *
 * Run: `node --test scripts/opsx/git-isolation.test.mjs`
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Resolve the root of the git repository that contains this script.
 * Works correctly even when invoked from a git worktree.
 *
 * @returns {string | null}  absolute path, or null if not inside a git repo
 */
function resolveHostRepoRoot() {
  try {
    // Strip git plumbing vars so we discover the real host repo via cwd
    // rather than any GIT_DIR that may be set in the agent's environment.
    const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...safeEnv } = process.env;
    void GIT_DIR; void GIT_WORK_TREE; void GIT_INDEX_FILE;
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: __dirname,
      encoding: 'utf8',
      env: safeEnv
    });
    return out.trim();
  } catch {
    return null;
  }
}

/**
 * Read a single git config value from the LOCAL scope only.
 * Returns null when the key is absent.
 *
 * @param {string} repoRoot
 * @param {string} key
 * @returns {string | null}
 */
function localConfigGet(repoRoot, key) {
  // Strip git plumbing vars for the same reason as above.
  const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...safeEnv } = process.env;
  void GIT_DIR; void GIT_WORK_TREE; void GIT_INDEX_FILE;
  try {
    const out = execFileSync('git', ['config', '--local', '--get', key], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: safeEnv
    });
    return out.trim();
  } catch {
    // exit 1 = key absent; exit 128 = not a git repo — both are "not set"
    return null;
  }
}

/**
 * Return the last N commits on HEAD as `{ sha, author, message }[]`.
 * Always runs against the host repo root (not via GIT_DIR).
 *
 * @param {string} repoRoot
 * @param {number} n
 * @returns {{ sha: string, author: string, message: string }[]}
 */
function recentCommits(repoRoot, n) {
  const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...safeEnv } = process.env;
  void GIT_DIR; void GIT_WORK_TREE; void GIT_INDEX_FILE;
  try {
    const out = execFileSync(
      'git',
      ['log', `--max-count=${n}`, '--format=%H%x1f%ae%x1f%s'],
      { cwd: repoRoot, encoding: 'utf8', env: safeEnv }
    );
    return out
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, author, ...msgParts] = line.split('\x1f');
        return { sha: sha ?? '', author: author ?? '', message: msgParts.join('\x1f') };
      });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Guard: skip gracefully when not running inside a git repo (e.g. a docker
// sandbox without git). All checks are best-effort; we warn rather than fail.
// ---------------------------------------------------------------------------

const repoRoot = resolveHostRepoRoot();

describe('git-isolation guard', () => {
  it('resolves the host repo root (sanity check)', () => {
    // If this fails the rest of the guard cannot run meaningfully.
    assert.ok(
      repoRoot !== null && existsSync(repoRoot),
      `could not locate host repo root (got: ${repoRoot})`
    );
  });

  it('core.bare is not true in local git config', () => {
    if (repoRoot === null) return; // skip — no git repo
    const bare = localConfigGet(repoRoot, 'core.bare');
    assert.notEqual(
      bare,
      'true',
      'core.bare=true found in local git config — a test or script ran "git init --bare" ' +
        'against the host repo. Check buildTmpRepo() and similar fixture helpers for ' +
        'missing GIT_DIR isolation.'
    );
  });

  it('fixture identity (test@example.com) not written to local git config', () => {
    if (repoRoot === null) return; // skip — no git repo
    const email = localConfigGet(repoRoot, 'user.email');
    assert.notEqual(
      email,
      'test@example.com',
      'user.email=test@example.com found in local git config — a fixture helper\'s ' +
        '"git config user.email" leaked to the host repo. Ensure buildTmpRepo() strips ' +
        'GIT_DIR from the child process env and passes --local to git config.'
    );
    const name = localConfigGet(repoRoot, 'user.name');
    assert.notEqual(
      name,
      'test',
      'user.name=test found in local git config — same root cause as user.email leak.'
    );
  });

  it('no fixture commits ("base"/"head" by test@example.com) on HEAD', () => {
    if (repoRoot === null) return; // skip — no git repo
    const commits = recentCommits(repoRoot, 10);
    const fixtureCommits = commits.filter(
      (c) =>
        c.author === 'test@example.com' &&
        (c.message === 'base' || c.message === 'head')
    );
    assert.equal(
      fixtureCommits.length,
      0,
      `fixture commits found on HEAD: ${JSON.stringify(fixtureCommits)}. ` +
        'A test fixture wrote commits to the host repo. Check buildTmpRepo() ' +
        'for GIT_DIR env isolation.'
    );
  });
});
