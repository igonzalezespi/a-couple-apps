// @ts-check

/**
 * Unit + integration tests for `lint-tasks-md.mjs`.
 *
 * Run: `node --test scripts/opsx/lint-tasks-md.test.mjs`
 *
 * Coverage closes the scenario-coverage gaps logged in verify-reports for
 * the source changes (issues #324 and #332) — the parent capability's
 * nine docs-only scenarios across `TaskListOutOfScopeUsesPlainBullets`
 * (4) and `OutOfScopeMirrorsNonGoalsOrder` (5), plus the six scenarios
 * defined by this change's new Requirement `TasksMdAuthoringLintEnforces`.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractTopicKey,
  formatFinding,
  isArchivePath,
  lintChangeDir,
  normalizeKey,
  pairBullets,
  parseDesignMd,
  parseTasksMd
} from './lint-tasks-md.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LINT_SCRIPT = resolve(__dirname, 'lint-tasks-md.mjs');

/**
 * @param {{ tasksMd?: string | null, designMd?: string | null }} opts
 * @returns {{ changeDir: string, cleanup: () => void }}
 */
function buildChangeDir({ tasksMd = null, designMd = null } = {}) {
  const changeDir = mkdtempSync(join(tmpdir(), 'opsx-tasklint-'));
  if (tasksMd !== null) writeFileSync(join(changeDir, 'tasks.md'), tasksMd);
  if (designMd !== null) writeFileSync(join(changeDir, 'design.md'), designMd);
  return {
    changeDir,
    cleanup: () => rmSync(changeDir, { recursive: true, force: true })
  };
}

const WELL_FORMED_DESIGN = `## Context

Background.

## Non-Goals

- **No retroactive archive edits.** Long paragraph rationale spanning multiple sentences explaining why archives stay immutable.
- **No automated lint.** Deferred to a follow-up change once the convention settles.
- **No upstream scaffolder changes.** The project-local template path stays canonical.

## Decisions

D1: ...
`;

const WELL_FORMED_TASKS = `## 1. Setup

- [ ] 1.1 Do thing.

## Out of Scope

- Retroactive archive edits. See design.md §Non-Goals.
- Automated lint enforcement deferred. See design.md §Non-Goals.
- Upstream scaffolder changes. See design.md §Non-Goals.
`;

describe('isArchivePath', () => {
  it('true for archive-prefixed change dir', () => {
    assert.equal(isArchivePath('openspec/changes/archive/2026-05-18-foo'), true);
  });
  it('true for absolute archive path', () => {
    assert.equal(isArchivePath('/abs/openspec/changes/archive/2026-05-18-foo'), true);
  });
  it('false for active change dir', () => {
    assert.equal(isArchivePath('openspec/changes/active-change'), false);
  });
  it('false for unrelated path', () => {
    assert.equal(isArchivePath('/tmp/somewhere'), false);
  });
});

describe('normalizeKey', () => {
  it('lowercases and strips punctuation', () => {
    assert.equal(normalizeKey('Retroactive Archive Edits!'), 'retroactive archive edits');
  });
  it('collapses whitespace', () => {
    assert.equal(normalizeKey('a    b\tc'), 'a b c');
  });
  it('strips leading "No " negation prefix', () => {
    assert.equal(normalizeKey('No retroactive archive edits'), 'retroactive archive edits');
  });
  it("strips leading \"Won't\" negation prefix", () => {
    assert.equal(normalizeKey("Won't change upstream"), 'change upstream');
  });
});

describe('extractTopicKey', () => {
  it('prefers bold lead clause and strips negation', () => {
    assert.equal(
      extractTopicKey('**No retroactive archive edits.** Long rationale.'),
      'retroactive archive edits'
    );
  });
  it('accepts bold lead with colon separator', () => {
    assert.equal(
      extractTopicKey('**No retroactive archive edits**: long rationale.'),
      'retroactive archive edits'
    );
  });
  it('uses lead noun phrase before cross-reference', () => {
    assert.equal(
      extractTopicKey('Retroactive reformatting of archived files. See design.md §Non-Goals.'),
      'retroactive reformatting of archived files'
    );
  });
  it('falls back to first sentence', () => {
    assert.equal(
      extractTopicKey('Plain bullet body with no bold lead and no cross-ref.'),
      'plain bullet body with no bold lead and no cross-ref'
    );
  });
  it('preserves comma-delimited lead phrase in cross-reference branch', () => {
    assert.equal(
      extractTopicKey('Multi-word item, sub-clause. See design.md §Non-Goals.'),
      'multi-word item sub-clause'
    );
    assert.equal(
      extractTopicKey('Multi-word item, sub-clause. See tasks.md §Out of Scope.'),
      'multi-word item sub-clause'
    );
  });
  it('handles period-free cross-reference body', () => {
    assert.equal(
      extractTopicKey('Item with no period See design.md §Non-Goals.'),
      'item with no period'
    );
  });
});

describe('parseTasksMd', () => {
  it('finds plain §Out of Scope heading', () => {
    const result = parseTasksMd(WELL_FORMED_TASKS);
    assert.notEqual(result.outOfScopeHeading, null);
    assert.equal(result.outOfScopeHeading?.numbered, false);
    assert.equal(result.outOfScopeBullets.length, 3);
    assert.equal(result.checkboxBullets.length, 0);
  });
  it('detects numbered heading anti-pattern', () => {
    const content = `## 4. Out of Scope\n\n- Plain bullet.\n`;
    const result = parseTasksMd(content);
    assert.notEqual(result.outOfScopeHeading, null);
    assert.equal(result.outOfScopeHeading?.numbered, true);
  });
  it('captures checkbox bullets separately', () => {
    const content = `## Out of Scope\n\n- [ ] 4.1 No production code changes.\n- Plain bullet.\n`;
    const result = parseTasksMd(content);
    assert.equal(result.checkboxBullets.length, 1);
    assert.equal(result.outOfScopeBullets.length, 1);
  });
  it('recognizes "Won\'t Do" alias', () => {
    const content = `## Won't Do\n\n- Bullet.\n`;
    const result = parseTasksMd(content);
    assert.notEqual(result.outOfScopeHeading, null);
  });
  it('returns null heading when section absent', () => {
    const content = `## 1. Setup\n\n- [ ] 1.1 Do thing.\n`;
    const result = parseTasksMd(content);
    assert.equal(result.outOfScopeHeading, null);
  });
});

describe('parseDesignMd', () => {
  it('finds dedicated `## Non-Goals` heading', () => {
    const result = parseDesignMd(WELL_FORMED_DESIGN);
    assert.notEqual(result.nonGoalsHeading, null);
    assert.equal(result.nonGoalsBullets.length, 3);
  });
  it('finds `**Non-Goals:**` sub-label under `## Goals / Non-Goals` (project convention)', () => {
    const content = `## Goals / Non-Goals\n\n**Goals:**\n\n- Goal alpha.\n- Goal beta.\n\n**Non-Goals:**\n\n- **No alpha.** rationale.\n- **No beta.** rationale.\n- **No gamma.** rationale.\n\n## Decisions\n`;
    const result = parseDesignMd(content);
    assert.notEqual(result.nonGoalsHeading, null);
    assert.equal(result.nonGoalsBullets.length, 3);
  });
  it('returns null heading when section absent', () => {
    const content = `## Context\n\nBackground.\n\n## Decisions\n\nD1.\n`;
    const result = parseDesignMd(content);
    assert.equal(result.nonGoalsHeading, null);
  });
});

describe('pairBullets', () => {
  it('succeeds when keys match exactly with identity permutation', () => {
    const a = [{ line: 1, body: '', topicKey: 'x' }, { line: 2, body: '', topicKey: 'y' }];
    const b = [{ line: 1, body: '', topicKey: 'x' }, { line: 2, body: '', topicKey: 'y' }];
    const r = pairBullets(a, b);
    assert.equal(r.ok, true);
    assert.deepEqual(r.permutation, [0, 1]);
  });
  it('succeeds via substring containment', () => {
    const a = [{ line: 1, body: '', topicKey: 'automated lint' }];
    const b = [{ line: 1, body: '', topicKey: 'automated lint enforcement deferred' }];
    const r = pairBullets(a, b);
    assert.equal(r.ok, true);
    assert.deepEqual(r.permutation, [0]);
  });
  it('prefers exact match over substring when both are available (regression: greedy steal)', () => {
    // Reproduces the false-negative where `lint` would be greedily assigned
    // to design[0]=`lint enforcement` via substring containment, leaving
    // `lint enforcement` to match design[1]=`lint`, producing identity
    // permutation [0,1] and suppressing the real drift.
    const a = [
      { line: 1, body: '', topicKey: 'lint enforcement' },
      { line: 2, body: '', topicKey: 'lint' }
    ];
    const b = [
      { line: 1, body: '', topicKey: 'lint' },
      { line: 2, body: '', topicKey: 'lint enforcement' }
    ];
    const r = pairBullets(a, b);
    assert.equal(r.ok, true);
    assert.deepEqual(r.permutation, [1, 0]);
  });
  it('produces non-identity permutation for reordered lists', () => {
    const a = [
      { line: 1, body: '', topicKey: 'alpha' },
      { line: 2, body: '', topicKey: 'beta' }
    ];
    const b = [
      { line: 1, body: '', topicKey: 'beta' },
      { line: 2, body: '', topicKey: 'alpha' }
    ];
    const r = pairBullets(a, b);
    assert.equal(r.ok, true);
    assert.deepEqual(r.permutation, [1, 0]);
  });
  it('fails on cardinality mismatch', () => {
    const a = [{ line: 1, body: '', topicKey: 'x' }];
    const b = [{ line: 1, body: '', topicKey: 'x' }, { line: 2, body: '', topicKey: 'y' }];
    const r = pairBullets(a, b);
    assert.equal(r.ok, false);
    assert.equal(r.permutation, null);
  });
  it('fails on unmatchable key', () => {
    const a = [{ line: 1, body: '', topicKey: 'alpha' }];
    const b = [{ line: 1, body: '', topicKey: 'beta' }];
    const r = pairBullets(a, b);
    assert.equal(r.ok, false);
  });
});

describe('lintChangeDir — LintPassesWellFormedTasksMd', () => {
  it('returns empty for matching mirror pair', () => {
    const fx = buildChangeDir({ tasksMd: WELL_FORMED_TASKS, designMd: WELL_FORMED_DESIGN });
    try {
      assert.deepEqual(lintChangeDir(fx.changeDir), []);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintReportsCheckboxedBulletInOutOfScope', () => {
  it('emits plain_bullets finding with correct line', () => {
    const tasks = `## 1. Setup\n\n- [ ] 1.1 Do thing.\n\n## Out of Scope\n\n- [ ] 4.1 No production code changes.\n- [x] 4.2 No widget tests.\n`;
    const fx = buildChangeDir({ tasksMd: tasks });
    try {
      const findings = lintChangeDir(fx.changeDir);
      const plain = findings.filter((f) => f.rule === 'plain_bullets');
      assert.equal(plain.length, 2);
      assert.equal(plain[0].file, 'tasks.md');
      assert.match(plain[0].message, /checkbox syntax/);
      assert.match(plain[0].message, /TaskListOutOfScopeUsesPlainBullets/);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintReportsUnNumberedCheckboxBulletInOutOfScope', () => {
  it('emits plain_bullets finding for `- [ ] …` without N.M prefix', () => {
    const tasks = `## 1. Setup\n\n- [ ] 1.1 Do thing.\n\n## Out of Scope\n\n- [ ] Plain text without numeric prefix.\n`;
    const fx = buildChangeDir({ tasksMd: tasks });
    try {
      const findings = lintChangeDir(fx.changeDir);
      const plain = findings.filter((f) => f.rule === 'plain_bullets');
      assert.equal(plain.length, 1);
      assert.equal(plain[0].file, 'tasks.md');
      assert.equal(plain[0].line, 7);
      assert.match(plain[0].message, /checkbox syntax/);
      assert.match(plain[0].message, /TaskListOutOfScopeUsesPlainBullets/);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintReportsCheckedUnNumberedCheckboxBulletInOutOfScope', () => {
  it('emits plain_bullets finding for `- [x] …` without N.M prefix', () => {
    const tasks = `## 1. Setup\n\n- [ ] 1.1 Do thing.\n\n## Out of Scope\n\n- [x] Plain text without numeric prefix.\n`;
    const fx = buildChangeDir({ tasksMd: tasks });
    try {
      const findings = lintChangeDir(fx.changeDir);
      const plain = findings.filter((f) => f.rule === 'plain_bullets');
      assert.equal(plain.length, 1);
      assert.equal(plain[0].file, 'tasks.md');
      assert.equal(plain[0].line, 7);
      assert.match(plain[0].message, /checkbox syntax/);
      assert.match(plain[0].message, /TaskListOutOfScopeUsesPlainBullets/);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintReportsNumberedHeadingInOutOfScope', () => {
  it('emits numbered_heading finding for `## N. Out of Scope`', () => {
    const tasks = `## 1. Setup\n\n- [ ] 1.1 Do thing.\n\n## 4. Out of Scope\n\n- Plain bullet.\n`;
    const fx = buildChangeDir({ tasksMd: tasks });
    try {
      const findings = lintChangeDir(fx.changeDir);
      const numbered = findings.filter((f) => f.rule === 'numbered_heading');
      assert.equal(numbered.length, 1);
      assert.match(numbered[0].message, /flatten to plain/);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintReportsOrderDrift', () => {
  it('flags first positional mismatch with both line numbers in message', () => {
    const design = `## Non-Goals\n\n- **Alpha rule.** rationale.\n- **Beta rule.** rationale.\n- **Gamma rule.** rationale.\n- **Delta rule.** rationale.\n- **Epsilon rule.** rationale.\n`;
    const tasks = `## Out of Scope\n\n- **Beta rule.** brief.\n- **Alpha rule.** brief.\n- **Delta rule.** brief.\n- **Gamma rule.** brief.\n- **Epsilon rule.** brief.\n`;
    const fx = buildChangeDir({ tasksMd: tasks, designMd: design });
    try {
      const findings = lintChangeDir(fx.changeDir);
      const drift = findings.filter((f) => f.rule === 'order_drift');
      assert.equal(drift.length, 1);
      assert.match(drift[0].message, /position 1/);
      assert.match(drift[0].message, /Reorder tasks\.md/);
      assert.match(drift[0].message, /OutOfScopeMirrorsNonGoalsOrder/);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintReportsPairingFailureOnAsymmetricCardinality', () => {
  it('emits pairing_failed, no order_drift', () => {
    const design = `## Non-Goals\n\n- **Alpha.** r.\n- **Beta.** r.\n- **Gamma.** r.\n`;
    const tasks = `## Out of Scope\n\n- **Alpha.** brief.\n- **Beta.** brief.\n`;
    const fx = buildChangeDir({ tasksMd: tasks, designMd: design });
    try {
      const findings = lintChangeDir(fx.changeDir);
      assert.equal(findings.filter((f) => f.rule === 'pairing_failed').length, 1);
      assert.equal(findings.filter((f) => f.rule === 'order_drift').length, 0);
      assert.match(findings[0].message, /cardinality mismatch/);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintReportsPairingFailureOnUntypedBullets', () => {
  it('emits pairing_failed when topic keys cannot match', () => {
    const design = `## Non-Goals\n\n- Apple banana cherry orchard date.\n- Vampire werewolf zombie monster ghost.\n`;
    const tasks = `## Out of Scope\n\n- Unrelated text about pottery.\n- Different topic entirely about painting.\n`;
    const fx = buildChangeDir({ tasksMd: tasks, designMd: design });
    try {
      const findings = lintChangeDir(fx.changeDir);
      assert.equal(findings.filter((f) => f.rule === 'pairing_failed').length, 1);
      assert.match(findings[0].message, /untyped or unmatchable/);
    } finally {
      fx.cleanup();
    }
  });
});

describe('lintChangeDir — LintSkipsArchivedChanges', () => {
  it('returns empty for archive-pathed change dir even with known drift', () => {
    // Manufacture an archive-pathed temp dir.
    const root = mkdtempSync(join(tmpdir(), 'opsx-archive-'));
    const archiveDir = join(root, 'openspec', 'changes', 'archive', '2026-01-01-bad');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(
      join(archiveDir, 'tasks.md'),
      `## 4. Out of Scope\n\n- [ ] 4.1 Anti-pattern bullet.\n`
    );
    try {
      assert.deepEqual(lintChangeDir(archiveDir), []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('lintChangeDir — LintIsApplicableOnlyWhenBothSectionsExist', () => {
  it('no design.md → no mirror findings', () => {
    const fx = buildChangeDir({ tasksMd: WELL_FORMED_TASKS });
    try {
      const findings = lintChangeDir(fx.changeDir);
      assert.equal(findings.filter((f) => f.rule === 'order_drift').length, 0);
      assert.equal(findings.filter((f) => f.rule === 'pairing_failed').length, 0);
    } finally {
      fx.cleanup();
    }
  });
  it('design.md without §Non-Goals → no mirror findings', () => {
    const design = `## Context\n\nBackground.\n\n## Decisions\n\nD1.\n`;
    const fx = buildChangeDir({ tasksMd: WELL_FORMED_TASKS, designMd: design });
    try {
      const findings = lintChangeDir(fx.changeDir);
      assert.equal(findings.filter((f) => f.rule === 'order_drift').length, 0);
      assert.equal(findings.filter((f) => f.rule === 'pairing_failed').length, 0);
    } finally {
      fx.cleanup();
    }
  });
  it('tasks.md without §Out of Scope → no findings at all', () => {
    const tasks = `## 1. Setup\n\n- [ ] 1.1 Do thing.\n`;
    const fx = buildChangeDir({ tasksMd: tasks, designMd: WELL_FORMED_DESIGN });
    try {
      assert.deepEqual(lintChangeDir(fx.changeDir), []);
    } finally {
      fx.cleanup();
    }
  });
});

describe('CLI exit codes (LintExitCodes)', () => {
  it('exits 2 on no argv', () => {
    const r = spawnSync(process.execPath, [LINT_SCRIPT], { encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /Usage:/);
  });
  it('exits 2 on non-existent change-dir', () => {
    const r = spawnSync(process.execPath, [LINT_SCRIPT, '/nonexistent/path'], {
      encoding: 'utf8'
    });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /does not exist/);
  });
  it('exits 0 on clean change', () => {
    const fx = buildChangeDir({ tasksMd: WELL_FORMED_TASKS, designMd: WELL_FORMED_DESIGN });
    try {
      const r = spawnSync(process.execPath, [LINT_SCRIPT, fx.changeDir], { encoding: 'utf8' });
      assert.equal(r.status, 0);
      assert.match(r.stdout, /✓/);
    } finally {
      fx.cleanup();
    }
  });
  it('exits 1 on findings', () => {
    const tasks = `## 4. Out of Scope\n\n- [ ] 4.1 Anti-pattern.\n`;
    const fx = buildChangeDir({ tasksMd: tasks });
    try {
      const r = spawnSync(process.execPath, [LINT_SCRIPT, fx.changeDir], { encoding: 'utf8' });
      assert.equal(r.status, 1);
      assert.match(r.stdout, /tasks_md_authoring_lint:plain_bullets/);
      assert.match(r.stdout, /tasks_md_authoring_lint:numbered_heading/);
    } finally {
      fx.cleanup();
    }
  });
  it('exits 0 on archive path with skip line', () => {
    const root = mkdtempSync(join(tmpdir(), 'opsx-archive-cli-'));
    const archiveDir = join(root, 'openspec', 'changes', 'archive', '2026-01-01-x');
    mkdirSync(archiveDir, { recursive: true });
    writeFileSync(join(archiveDir, 'tasks.md'), `## 4. Out of Scope\n\n- [ ] 4.1 bad.\n`);
    try {
      const r = spawnSync(process.execPath, [LINT_SCRIPT, archiveDir], { encoding: 'utf8' });
      assert.equal(r.status, 0);
      assert.match(r.stdout, /skipped \(archive immutable/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('lintChangeDir — LintHandlesProseRegisterAsymmetry', () => {
  it('paragraph-form design + one-liner tasks with cross-ref → clean', () => {
    const design = `## Non-Goals\n\n- **No retroactive archive edits.** Long rationale paragraph explaining the constraint in detail, citing prior precedent.\n- **No automated lint.** Deferred for the convention to settle.\n`;
    const tasks = `## Out of Scope\n\n- Retroactive archive edits. See design.md §Non-Goals.\n- Automated lint enforcement. See design.md §Non-Goals.\n`;
    const fx = buildChangeDir({ tasksMd: tasks, designMd: design });
    try {
      assert.deepEqual(lintChangeDir(fx.changeDir), []);
    } finally {
      fx.cleanup();
    }
  });
});

describe('formatFinding', () => {
  it('formats as <dir>/<file>:<line>: tasks_md_authoring_lint:<rule>: <message>', () => {
    const out = formatFinding('/tmp/x', {
      file: 'tasks.md',
      line: 42,
      rule: 'plain_bullets',
      message: 'msg'
    });
    assert.equal(out, '/tmp/x/tasks.md:42: tasks_md_authoring_lint:plain_bullets: msg');
  });
});
