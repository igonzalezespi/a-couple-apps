#!/usr/bin/env node
// @ts-check

/**
 * Parser for verify-report.md files produced by /opsx:verify.
 *
 * Walks the fixed H2/H3 heading schema and extracts each section as a
 * typed object. Throws on unknown sections, missing required sections,
 * or out-of-order headings.
 *
 * Consumed by:
 *   - /opsx:archive to compose the PR body from a verified change
 *   - scripts/opsx/verify-report-lint.mjs for schema validation
 *
 * Usage (programmatic):
 *   import { parseVerifyReport } from './verify-report-parser.mjs';
 *   const report = parseVerifyReport(contents, 'verify-report.md');
 *
 * Usage (CLI):
 *   node scripts/opsx/verify-report-parser.mjs <path>
 *   # Prints parsed JSON to stdout; exits non-zero on parse error.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * @typedef {'CRITICAL' | 'WARNING' | 'SUGGESTION'} FindingSeverity
 */

/**
 * @typedef {'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED' | 'BLOCKED_LOOP' | 'RECONSTRUCTED'} VerifyStatus
 */

/**
 * @typedef {object} VerifyReportHeader
 * @property {string} changeName
 * @property {string} verifiedAt
 * @property {VerifyStatus | null} status
 * @property {string | null} schemaName
 * @property {number | null} iterations
 * @property {boolean} dryRun
 */

/**
 * @typedef {object} VerifyReportSection
 * @property {string} name
 * @property {string} body
 * @property {boolean} isEmpty
 */

/**
 * @typedef {object} VerifyReport
 * @property {VerifyReportHeader} header
 * @property {VerifyReportSection} scorecard
 * @property {{ critical: VerifyReportSection, warning: VerifyReportSection, suggestion: VerifyReportSection }} findings
 * @property {VerifyReportSection} fixesApplied
 * @property {VerifyReportSection} deferredWork
 * @property {VerifyReportSection} manualActions
 * @property {VerifyReportSection} specDrift
 * @property {VerifyReportSection} testCompliance
 * @property {VerifyReportSection} finalAssessment
 */

/** Required H2 sections in canonical order. */
export const REQUIRED_H2_SECTIONS = /** @type {const} */ ([
  'Scorecard',
  'Findings',
  'Fixes Applied During Verify',
  'Deferred Work',
  'Manual Actions Required',
  'Spec Drift Resolutions',
  'Test Compliance',
  'Final Assessment'
]);

/** Required H3 sub-sections under `## Findings`, in canonical order. */
export const REQUIRED_FINDINGS_H3 = /** @type {const} */ (['CRITICAL', 'WARNING', 'SUGGESTION']);

export const EMPTY_SENTINEL = '_None_';

const H1_LINE = /^#\s+(.+)$/;
const H2_LINE = /^##\s+(.+)$/;
const H3_LINE = /^###\s+(.+)$/;
const HEADER_FIELD = /^\*\*([A-Za-z ]+)\*\*:\s*`?([^`]*)`?\s*$/;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;

/**
 * Strip HTML comments from a block of text and normalize whitespace.
 * HTML comments inside verify-report.md are documentation for the author,
 * not content. Parser strips them so downstream consumers (linter, archive
 * PR composer, isEmpty check) see only real content.
 *
 * @param {string} body
 * @returns {string}
 */
function stripComments(body) {
  return body
    .replace(HTML_COMMENT, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parse verify-report.md content into a typed VerifyReport object.
 *
 * @param {string} contents - Full file contents.
 * @param {string} filePath - Path for error reporting only.
 * @returns {VerifyReport}
 * @throws {Error} If the schema is violated.
 */
export function parseVerifyReport(contents, filePath) {
  const lines = contents.split(/\r?\n/);
  const header = parseHeader(lines, filePath);
  const h2Sections = collectH2Sections(lines, filePath);
  validateH2Order(h2Sections, filePath);

  const scorecard = h2Sections.get('Scorecard');
  const findings = h2Sections.get('Findings');
  const fixesApplied = h2Sections.get('Fixes Applied During Verify');
  const deferredWork = h2Sections.get('Deferred Work');
  const manualActions = h2Sections.get('Manual Actions Required');
  const specDrift = h2Sections.get('Spec Drift Resolutions');
  const testCompliance = h2Sections.get('Test Compliance');
  const finalAssessment = h2Sections.get('Final Assessment');

  if (
    !scorecard ||
    !findings ||
    !fixesApplied ||
    !deferredWork ||
    !manualActions ||
    !specDrift ||
    !testCompliance ||
    !finalAssessment
  ) {
    throw new Error(
      `[verify-report-parser] ${filePath}: required H2 section missing after validation pass (internal).`
    );
  }

  const findingsH3 = collectH3SubSections(findings.body, 'Findings', filePath);
  validateH3Order(findingsH3, filePath);

  const critical = findingsH3.get('CRITICAL');
  const warning = findingsH3.get('WARNING');
  const suggestion = findingsH3.get('SUGGESTION');

  if (!critical || !warning || !suggestion) {
    throw new Error(
      `[verify-report-parser] ${filePath}: required Findings H3 sub-section missing after validation pass (internal).`
    );
  }

  return {
    header,
    scorecard,
    findings: {
      critical,
      warning,
      suggestion
    },
    fixesApplied,
    deferredWork,
    manualActions,
    specDrift,
    testCompliance,
    finalAssessment
  };
}

/**
 * @param {string} filePath
 * @returns {VerifyReport}
 */
export function parseVerifyReportFile(filePath) {
  const contents = readFileSync(filePath, 'utf8');
  return parseVerifyReport(contents, filePath);
}

/**
 * Extract the H1 title + the header key/value block that follows it.
 * @param {string[]} lines
 * @param {string} filePath
 * @returns {VerifyReportHeader}
 */
function parseHeader(lines, filePath) {
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const match = H1_LINE.exec(line);
    if (match) {
      titleIdx = i;
      break;
    }
    if (H2_LINE.test(line)) break;
  }

  if (titleIdx === -1) {
    throw new Error(`[verify-report-parser] ${filePath}: missing H1 title line.`);
  }

  const titleLine = lines[titleIdx];
  const titleMatch = H1_LINE.exec(titleLine);
  if (!titleMatch) {
    throw new Error(`[verify-report-parser] ${filePath}: H1 title malformed.`);
  }
  const titleText = titleMatch[1].trim();
  const titlePrefix = 'Verify Report:';
  if (!titleText.startsWith(titlePrefix)) {
    throw new Error(
      `[verify-report-parser] ${filePath}: H1 must start with "${titlePrefix}", got "${titleText}".`
    );
  }
  const changeName = titleText.slice(titlePrefix.length).trim();

  const fieldMap = /** @type {Map<string, string>} */ (new Map());
  for (let i = titleIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (H2_LINE.test(line)) break;
    const match = HEADER_FIELD.exec(line.trim());
    if (match) {
      fieldMap.set(match[1].trim(), match[2].trim());
    }
  }

  const statusRaw = fieldMap.get('Status') || null;
  const status =
    statusRaw && /^(READY|READY_WITH_WARNINGS|BLOCKED|BLOCKED_LOOP|RECONSTRUCTED)$/.test(statusRaw)
      ? /** @type {VerifyStatus} */ (statusRaw)
      : null;

  const iterationsRaw = fieldMap.get('Iterations');
  const iterations = iterationsRaw && /^\d+$/.test(iterationsRaw) ? Number(iterationsRaw) : null;

  const dryRunRaw = (fieldMap.get('Dry Run') || '').toLowerCase();
  const dryRun = dryRunRaw === 'true';

  return {
    changeName,
    verifiedAt: fieldMap.get('Verified') || '',
    status,
    schemaName: fieldMap.get('Schema') || null,
    iterations,
    dryRun
  };
}

/**
 * Collect H2 sections into a name→section map.
 * @param {string[]} lines
 * @param {string} filePath
 * @returns {Map<string, VerifyReportSection>}
 */
function collectH2Sections(lines, filePath) {
  const sections = /** @type {Map<string, VerifyReportSection>} */ (new Map());
  let currentName = null;
  let currentStart = -1;

  const flush = (endIdx) => {
    if (currentName === null || currentStart === -1) return;
    const bodyLines = lines.slice(currentStart + 1, endIdx);
    const rawBody = bodyLines.join('\n');
    const body = stripComments(rawBody);
    sections.set(currentName, {
      name: currentName,
      body,
      isEmpty: body === EMPTY_SENTINEL
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const match = H2_LINE.exec(lines[i]);
    if (match) {
      flush(i);
      currentName = match[1].trim();
      currentStart = i;
    }
  }
  flush(lines.length);

  const unknown = [];
  for (const name of sections.keys()) {
    if (!REQUIRED_H2_SECTIONS.includes(/** @type {any} */ (name))) {
      unknown.push(name);
    }
  }
  if (unknown.length > 0) {
    throw new Error(
      `[verify-report-parser] ${filePath}: unknown H2 sections: ${unknown
        .map((name) => `"${name}"`)
        .join(', ')}. Allowed: ${REQUIRED_H2_SECTIONS.join(', ')}.`
    );
  }

  return sections;
}

/**
 * @param {Map<string, VerifyReportSection>} sections
 * @param {string} filePath
 */
function validateH2Order(sections, filePath) {
  const missing = REQUIRED_H2_SECTIONS.filter((name) => !sections.has(name));
  if (missing.length > 0) {
    throw new Error(
      `[verify-report-parser] ${filePath}: missing required H2 sections: ${missing.join(', ')}.`
    );
  }
  const actualOrder = [...sections.keys()];
  for (let i = 0; i < REQUIRED_H2_SECTIONS.length; i += 1) {
    if (actualOrder[i] !== REQUIRED_H2_SECTIONS[i]) {
      throw new Error(
        `[verify-report-parser] ${filePath}: H2 sections out of order at position ${i}: expected "${REQUIRED_H2_SECTIONS[i]}", got "${actualOrder[i]}".`
      );
    }
  }
}

/**
 * @param {string} body
 * @param {string} parentName
 * @param {string} filePath
 * @returns {Map<string, VerifyReportSection>}
 */
function collectH3SubSections(body, parentName, filePath) {
  const lines = body.split(/\r?\n/);
  const sections = /** @type {Map<string, VerifyReportSection>} */ (new Map());
  let currentName = null;
  let currentStart = -1;

  const flush = (endIdx) => {
    if (currentName === null || currentStart === -1) return;
    const rawSubBody = lines.slice(currentStart + 1, endIdx).join('\n');
    const subBody = stripComments(rawSubBody);
    sections.set(currentName, {
      name: currentName,
      body: subBody,
      isEmpty: subBody === EMPTY_SENTINEL
    });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const match = H3_LINE.exec(lines[i]);
    if (match) {
      flush(i);
      currentName = match[1].trim();
      currentStart = i;
    }
  }
  flush(lines.length);

  const unknown = [];
  for (const name of sections.keys()) {
    if (!REQUIRED_FINDINGS_H3.includes(/** @type {any} */ (name))) {
      unknown.push(name);
    }
  }
  if (unknown.length > 0) {
    throw new Error(
      `[verify-report-parser] ${filePath}: unknown H3 sub-sections under "${parentName}": ${unknown
        .map((name) => `"${name}"`)
        .join(', ')}. Allowed: ${REQUIRED_FINDINGS_H3.join(', ')}.`
    );
  }
  return sections;
}

/**
 * @param {Map<string, VerifyReportSection>} sections
 * @param {string} filePath
 */
function validateH3Order(sections, filePath) {
  const missing = REQUIRED_FINDINGS_H3.filter((name) => !sections.has(name));
  if (missing.length > 0) {
    throw new Error(
      `[verify-report-parser] ${filePath}: missing required Findings H3 sub-sections: ${missing.join(', ')}.`
    );
  }
  const actualOrder = [...sections.keys()];
  for (let i = 0; i < REQUIRED_FINDINGS_H3.length; i += 1) {
    if (actualOrder[i] !== REQUIRED_FINDINGS_H3[i]) {
      throw new Error(
        `[verify-report-parser] ${filePath}: Findings H3 sub-sections out of order at position ${i}: expected "${REQUIRED_FINDINGS_H3[i]}", got "${actualOrder[i]}".`
      );
    }
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const [, , filePath] = process.argv;
  if (!filePath) {
    console.error('Usage: node scripts/opsx/verify-report-parser.mjs <path-to-verify-report.md>');
    process.exit(2);
  }
  try {
    const report = parseVerifyReportFile(filePath);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
