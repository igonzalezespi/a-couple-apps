// @ts-check

/**
 * Unit + integration tests for `archive-doc-edit-guard.mjs`.
 *
 * Run: `node --test scripts/opsx/archive-doc-edit-guard.test.mjs`
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeGuardDecision,
  extractImpactSection,
  findAuthorizingProposalForPath,
  formatRejectionMessage,
  parseDiffLines,
  parseCliArgs,
  proposalAuthorizesPath,
  runGuard
} from './archive-doc-edit-guard.mjs';

describe('parseDiffLines', () => {
  it('returns empty for an empty diff', () => {
    const result = parseDiffLines('');
    assert.deepEqual(result.modifiedArchiveDesignPaths, []);
  });

  it('returns empty when the diff has only non-archive paths', () => {
    const diff = ['M\tlib/foo.dart', 'M\ttest/foo_test.dart'].join('\n');
    const result = parseDiffLines(diff);
    assert.deepEqual(result.modifiedArchiveDesignPaths, []);
  });

  it('returns one path for a single-modification diff', () => {
    const diff = 'M\topenspec/changes/archive/2026-01-01-foo/design.md';
    const result = parseDiffLines(diff);
    assert.deepEqual(result.modifiedArchiveDesignPaths, [
      'openspec/changes/archive/2026-01-01-foo/design.md'
    ]);
  });

  it('returns all paths for a multi-modification diff', () => {
    const diff = [
      'M\topenspec/changes/archive/2026-01-01-foo/design.md',
      'M\topenspec/changes/archive/2026-02-02-bar/design.md',
      'M\tlib/baz.dart'
    ].join('\n');
    const result = parseDiffLines(diff);
    assert.deepEqual(result.modifiedArchiveDesignPaths, [
      'openspec/changes/archive/2026-01-01-foo/design.md',
      'openspec/changes/archive/2026-02-02-bar/design.md'
    ]);
  });

  it('defensively ignores rename/copy rows with three columns', () => {
    const diff = [
      'R100\topenspec/changes/archive/2026-01-01-foo/design.md\topenspec/changes/archive/2026-02-02-bar/design.md',
      'M\topenspec/changes/archive/2026-03-03-baz/design.md'
    ].join('\n');
    const result = parseDiffLines(diff);
    assert.deepEqual(result.modifiedArchiveDesignPaths, [
      'openspec/changes/archive/2026-03-03-baz/design.md'
    ]);
  });

  it('ignores non-archive paths under openspec/', () => {
    const diff = [
      'M\topenspec/changes/in-flight/proposal.md',
      'M\topenspec/changes/archive/2026-01-01-foo/proposal.md',
      'M\topenspec/changes/archive/2026-01-01-foo/design.md'
    ].join('\n');
    const result = parseDiffLines(diff);
    assert.deepEqual(result.modifiedArchiveDesignPaths, [
      'openspec/changes/archive/2026-01-01-foo/design.md'
    ]);
  });

  it('handles CRLF line endings', () => {
    const diff = 'M\topenspec/changes/archive/2026-01-01-foo/design.md\r\n';
    const result = parseDiffLines(diff);
    assert.deepEqual(result.modifiedArchiveDesignPaths, [
      'openspec/changes/archive/2026-01-01-foo/design.md'
    ]);
  });
});

describe('extractImpactSection', () => {
  it('returns the section body when present', () => {
    const proposal = [
      '## Why',
      'rationale',
      '',
      '## Impact',
      '- **Affected files:** lib/foo.dart',
      '- Tests: unit',
      '',
      '## Capabilities',
      'list'
    ].join('\n');
    const impact = extractImpactSection(proposal);
    assert.match(impact, /Affected files:\*\* lib\/foo\.dart/);
    assert.doesNotMatch(impact, /Capabilities/);
    assert.doesNotMatch(impact, /## Impact/);
  });

  it('returns empty when no Impact section exists', () => {
    const proposal = ['## Why', 'rationale', '', '## Capabilities', 'list'].join('\n');
    const impact = extractImpactSection(proposal);
    assert.equal(impact, '');
  });

  it('returns the body when Impact is the last section in the file', () => {
    const proposal = ['## Why', 'rationale', '', '## Impact', '- last'].join('\n');
    const impact = extractImpactSection(proposal);
    assert.match(impact, /- last/);
  });

  it('stops at the next ## heading', () => {
    const proposal = [
      '## Impact',
      'first',
      '## Other',
      'should not appear',
      '## Yet Another',
      'also should not appear'
    ].join('\n');
    const impact = extractImpactSection(proposal);
    assert.match(impact, /first/);
    assert.doesNotMatch(impact, /should not appear/);
    assert.doesNotMatch(impact, /also should not appear/);
  });

  it('does not match ### subsections as terminators', () => {
    const proposal = ['## Impact', 'before sub', '### Sub', 'after sub'].join('\n');
    const impact = extractImpactSection(proposal);
    assert.match(impact, /before sub/);
    assert.match(impact, /after sub/);
  });

  it('terminates on a malformed heading without a space (`##Foo`)', () => {
    const proposal = ['## Impact', 'before malformed', '##Foo', 'after malformed body'].join(
      '\n'
    );
    const impact = extractImpactSection(proposal);
    assert.match(impact, /before malformed/);
    assert.doesNotMatch(impact, /after malformed body/);
    assert.doesNotMatch(impact, /##Foo/);
  });

  it('terminates on a tab-separated heading (`##\\tFoo`)', () => {
    const proposal = ['## Impact', 'before tab', '##\tFoo', 'after tab body'].join('\n');
    const impact = extractImpactSection(proposal);
    assert.match(impact, /before tab/);
    assert.doesNotMatch(impact, /after tab body/);
  });
});

describe('proposalAuthorizesPath', () => {
  const archivePath = 'openspec/changes/archive/2026-01-01-foo/design.md';

  it('authorizes when path appears in Impact', () => {
    const proposal = [
      '## Why',
      'unrelated text',
      '## Impact',
      `- **Affected files:** ${archivePath}`
    ].join('\n');
    assert.equal(proposalAuthorizesPath(proposal, archivePath), true);
  });

  it('does not authorize when path appears only in Why', () => {
    const proposal = ['## Why', `mentions ${archivePath}`, '## Impact', 'no path here'].join('\n');
    assert.equal(proposalAuthorizesPath(proposal, archivePath), false);
  });

  it('does not authorize when path appears only in What Changes', () => {
    const proposal = [
      '## Why',
      'rationale',
      '## What Changes',
      `Edit ${archivePath} Decision 1`,
      '## Impact',
      'no path'
    ].join('\n');
    assert.equal(proposalAuthorizesPath(proposal, archivePath), false);
  });

  it('does not authorize on partial path match (substring of a longer path)', () => {
    const longerPath = 'openspec/changes/archive/2026-01-01-foo-extended/design.md';
    const proposal = ['## Impact', `- **Affected files:** ${longerPath}`].join('\n');
    assert.equal(proposalAuthorizesPath(proposal, archivePath), false);
  });

  it('authorizes when the literal full path is present even if a longer path is also there', () => {
    const longerPath = 'openspec/changes/archive/2026-01-01-foo-extended/design.md';
    const proposal = [
      '## Impact',
      `- **Affected files:** ${archivePath}, ${longerPath}`
    ].join('\n');
    assert.equal(proposalAuthorizesPath(proposal, archivePath), true);
  });

  it('returns false for an empty proposal', () => {
    assert.equal(proposalAuthorizesPath('', archivePath), false);
  });

  it('does not authorize on adjacent-suffix lookalike (`design.md.bak`)', () => {
    const proposal = [
      '## Impact',
      `- **Affected files:** ${archivePath}.bak`
    ].join('\n');
    assert.equal(proposalAuthorizesPath(proposal, archivePath), false);
  });
});

describe('computeGuardDecision', () => {
  it('allows when no archive mods are present', () => {
    const decision = computeGuardDecision({
      modifiedArchiveDesignPaths: [],
      authorizesPath: () => false
    });
    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.offendingPaths, []);
  });

  it('allows when every modified path is authorized', () => {
    const paths = [
      'openspec/changes/archive/2026-01-01-foo/design.md',
      'openspec/changes/archive/2026-02-02-bar/design.md'
    ];
    const decision = computeGuardDecision({
      modifiedArchiveDesignPaths: paths,
      authorizesPath: () => true
    });
    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.offendingPaths, []);
  });

  it('rejects when one path of two is unauthorized; reports only the offender', () => {
    const authorized = 'openspec/changes/archive/2026-01-01-foo/design.md';
    const unauthorized = 'openspec/changes/archive/2026-02-02-bar/design.md';
    const decision = computeGuardDecision({
      modifiedArchiveDesignPaths: [authorized, unauthorized],
      authorizesPath: (path) => path === authorized
    });
    assert.equal(decision.allowed, false);
    assert.deepEqual(decision.offendingPaths, [unauthorized]);
    assert.match(decision.reason, /\*\*Affected files:\*\*/);
  });

  it('rejects when all paths are unauthorized; reports all of them', () => {
    const paths = [
      'openspec/changes/archive/2026-01-01-foo/design.md',
      'openspec/changes/archive/2026-02-02-bar/design.md'
    ];
    const decision = computeGuardDecision({
      modifiedArchiveDesignPaths: paths,
      authorizesPath: () => false
    });
    assert.equal(decision.allowed, false);
    assert.deepEqual(decision.offendingPaths, paths);
  });
});

describe('formatRejectionMessage', () => {
  it('mentions Affected files and forbids bypass', () => {
    const decision = {
      allowed: false,
      reason: 'test reason',
      offendingPaths: ['openspec/changes/archive/2026-01-01-foo/design.md']
    };
    const message = formatRejectionMessage(decision);
    assert.match(message, /\*\*Affected files:\*\*/);
    assert.match(message, /no --no-verify/);
    assert.match(message, /openspec\/changes\/archive\/2026-01-01-foo\/design\.md/);
    assert.doesNotMatch(message, /CAPABILITY_NAME/);
    assert.doesNotMatch(message, /openspec-archive-doc-accuracy/);
  });
});

describe('parseCliArgs', () => {
  it('defaults to staged when given no args', () => {
    assert.deepEqual(parseCliArgs([]), { mode: 'staged' });
  });

  it('parses --mode=staged', () => {
    assert.deepEqual(parseCliArgs(['--mode=staged']), { mode: 'staged' });
  });

  it('parses --mode=range with base and head', () => {
    assert.deepEqual(parseCliArgs(['--mode=range', '--base=abc', '--head=def']), {
      mode: 'range',
      base: 'abc',
      head: 'def'
    });
  });

  it('throws when --mode=range is missing base or head', () => {
    assert.throws(() => parseCliArgs(['--mode=range']), /requires --base/);
    assert.throws(() => parseCliArgs(['--mode=range', '--base=abc']), /requires --base/);
  });

  it('throws on unknown mode', () => {
    assert.throws(() => parseCliArgs(['--mode=bogus']), /unknown --mode/);
  });

  it('throws on unrecognized argument', () => {
    assert.throws(() => parseCliArgs(['--whatever']), /unrecognized argument/);
  });
});

/**
 * Build a temporary git repo with two commits:
 *   - base: a fake archived design.md
 *   - head: same design.md, modified
 *
 * Optionally seeds an in-flight proposal that authorizes the modification.
 *
 * @param {object} opts
 * @param {boolean} opts.includeAuthorizingProposal
 * @returns {{ repoRoot: string, baseSha: string, headSha: string, archivePath: string, cleanup: () => void }}
 */
function buildTmpRepo({ includeAuthorizingProposal }) {
  const repoRoot = mkdtempSync(join(tmpdir(), 'opsx-guard-test-'));
  const archivePath = 'openspec/changes/archive/2026-01-01-foo/design.md';
  const archiveDir = join(repoRoot, 'openspec/changes/archive/2026-01-01-foo');

  const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  git('config', 'commit.gpgsign', 'false');

  mkdirSync(archiveDir, { recursive: true });
  writeFileSync(join(archiveDir, 'design.md'), '# Original\n\nDecision 1: original choice.\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'base');
  const baseSha = git('rev-parse', 'HEAD').trim();

  if (includeAuthorizingProposal) {
    const inFlightDir = join(repoRoot, 'openspec/changes/realign-foo');
    mkdirSync(inFlightDir, { recursive: true });
    const proposal = [
      '## Why',
      'drift discovered.',
      '',
      '## What Changes',
      'targeted edit.',
      '',
      '## Impact',
      `- **Affected files:** ${archivePath}`,
      '- Code: none.',
      ''
    ].join('\n');
    writeFileSync(join(inFlightDir, 'proposal.md'), proposal);
  }

  writeFileSync(join(archiveDir, 'design.md'), '# Edited\n\nDecision 1: corrected choice.\n');
  git('add', '.');
  git('commit', '--quiet', '-m', 'head');
  const headSha = git('rev-parse', 'HEAD').trim();

  return {
    repoRoot,
    baseSha,
    headSha,
    archivePath,
    cleanup: () => rmSync(repoRoot, { recursive: true, force: true })
  };
}

describe('findAuthorizingProposalForPath (filesystem)', () => {
  it('returns empty when changes dir is missing', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'opsx-guard-test-'));
    try {
      const result = findAuthorizingProposalForPath(tmp, 'openspec/changes/archive/x/design.md');
      assert.deepEqual(result, []);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('skips the archive subtree even if a proposal there mentions the path', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'opsx-guard-test-'));
    try {
      const archivePath = 'openspec/changes/archive/2026-01-01-foo/design.md';
      const archivedProposalDir = join(tmp, 'openspec/changes/archive/2026-01-01-foo');
      mkdirSync(archivedProposalDir, { recursive: true });
      writeFileSync(
        join(archivedProposalDir, 'proposal.md'),
        `## Impact\n- ${archivePath}\n`
      );
      const result = findAuthorizingProposalForPath(tmp, archivePath);
      assert.deepEqual(result, []);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('runGuard (integration)', () => {
  it('rejects an unauthorized archive design.md modification', () => {
    const fixture = buildTmpRepo({ includeAuthorizingProposal: false });
    try {
      const decision = runGuard(
        { mode: 'range', base: fixture.baseSha, head: fixture.headSha },
        fixture.repoRoot
      );
      assert.equal(decision.allowed, false);
      assert.deepEqual(decision.offendingPaths, [fixture.archivePath]);
    } finally {
      fixture.cleanup();
    }
  });

  it('allows a modification when an in-flight proposal authorizes the path', () => {
    const fixture = buildTmpRepo({ includeAuthorizingProposal: true });
    try {
      const decision = runGuard(
        { mode: 'range', base: fixture.baseSha, head: fixture.headSha },
        fixture.repoRoot
      );
      assert.equal(decision.allowed, true);
      assert.deepEqual(decision.offendingPaths, []);
    } finally {
      fixture.cleanup();
    }
  });
});
