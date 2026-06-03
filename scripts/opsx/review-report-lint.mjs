#!/usr/bin/env node
// @ts-check

/**
 * Schema linter for review-report.md files produced by /opsx:apply pre-apply
 * review gate (auto-invoked /osx:review).
 *
 * Review reports share the same fixed-heading philosophy as verify-report.md
 * but with a distinct section list: Scorecard, Artifact Findings, Fixes
 * Applied During Review, Deferred Artifact Work, Readiness, Next Step.
 * Findings has three H3 sub-sections (CRITICAL, WARNING, SUGGESTION).
 *
 * Usage (CLI):
 *   node scripts/opsx/review-report-lint.mjs <path> [<path> ...]
 *   # Exits 0 on success, non-zero on any error.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED_H2_SECTIONS = /** @type {const} */ ([
  'Scorecard',
  'Artifact Findings',
  'Fixes Applied During Review',
  'Deferred Artifact Work',
  'Readiness',
  'Next Step'
]);

const REQUIRED_H3_SECTIONS = /** @type {const} */ (['CRITICAL', 'WARNING', 'SUGGESTION']);

const EMPTY_SENTINEL = '_None_';

const H1_LINE = /^#\s+(.+)$/;
const H2_LINE = /^##\s+(.+)$/;
const H3_LINE = /^###\s+(.+)$/;
const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const FINDING_ID_MARKER = /\*\*\[([a-f0-9]{8})\]\*\*/g;

/**
 * @typedef {object} LintResult
 * @property {string} filePath
 * @property {string[]} errors
 * @property {string[]} warnings
 */

/**
 * Lint review-report contents.
 *
 * @param {string} contents
 * @param {string} filePath
 * @returns {LintResult}
 */
export function lintReviewReportContent(contents, filePath) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  const lines = contents.split(/\r?\n/);

  // H1 title check.
  let titleIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (H1_LINE.test(lines[i])) {
      titleIdx = i;
      break;
    }
    if (H2_LINE.test(lines[i])) break;
  }
  if (titleIdx === -1) {
    errors.push(`[lint] ${filePath}: missing H1 title line.`);
    return { filePath, errors, warnings };
  }
  const titleMatch = H1_LINE.exec(lines[titleIdx]);
  if (!titleMatch || !titleMatch[1].trim().startsWith('Review Report:')) {
    errors.push(
      `[lint] ${filePath}: H1 must start with "Review Report:" — got "${titleMatch ? titleMatch[1] : ''}".`
    );
  }

  // Walk H2 sections.
  const h2Ranges = /** @type {Array<{ name: string, start: number, end: number }>} */ ([]);
  for (let i = titleIdx + 1; i < lines.length; i += 1) {
    const match = H2_LINE.exec(lines[i]);
    if (!match) continue;
    h2Ranges.push({ name: match[1].trim(), start: i, end: lines.length });
    const prev = h2Ranges[h2Ranges.length - 2];
    if (prev) prev.end = i;
  }

  const actualNames = h2Ranges.map((range) => range.name);
  const missing = REQUIRED_H2_SECTIONS.filter((name) => !actualNames.includes(name));
  if (missing.length > 0) {
    errors.push(`[lint] ${filePath}: missing H2 sections: ${missing.join(', ')}.`);
  }

  const unknown = actualNames.filter(
    (name) => !(/** @type {readonly string[]} */ (REQUIRED_H2_SECTIONS).includes(name))
  );
  if (unknown.length > 0) {
    errors.push(
      `[lint] ${filePath}: unknown H2 sections: ${unknown.map((name) => `"${name}"`).join(', ')}. Allowed: ${REQUIRED_H2_SECTIONS.join(', ')}.`
    );
  }

  for (let i = 0; i < REQUIRED_H2_SECTIONS.length && i < actualNames.length; i += 1) {
    if (actualNames[i] !== REQUIRED_H2_SECTIONS[i]) {
      errors.push(
        `[lint] ${filePath}: H2 sections out of order at position ${i}: expected "${REQUIRED_H2_SECTIONS[i]}", got "${actualNames[i]}".`
      );
      break;
    }
  }

  if (errors.length > 0) return { filePath, errors, warnings };

  // Findings H3 check + body sentinel check.
  for (const range of h2Ranges) {
    const bodyLines = lines.slice(range.start + 1, range.end);
    const rawBody = bodyLines.join('\n');
    const body = rawBody
      .replace(HTML_COMMENT, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (range.name === 'Artifact Findings') {
      const h3Names = /** @type {string[]} */ ([]);
      for (let i = 0; i < bodyLines.length; i += 1) {
        const match = H3_LINE.exec(bodyLines[i]);
        if (match) h3Names.push(match[1].trim());
      }
      const missingH3 = REQUIRED_H3_SECTIONS.filter((name) => !h3Names.includes(name));
      if (missingH3.length > 0) {
        errors.push(
          `[lint] ${filePath}: missing Artifact Findings H3 sub-sections: ${missingH3.join(', ')}.`
        );
      }
      for (let i = 0; i < REQUIRED_H3_SECTIONS.length && i < h3Names.length; i += 1) {
        if (h3Names[i] !== REQUIRED_H3_SECTIONS[i]) {
          errors.push(
            `[lint] ${filePath}: Artifact Findings H3 sub-sections out of order at position ${i}: expected "${REQUIRED_H3_SECTIONS[i]}", got "${h3Names[i]}".`
          );
          break;
        }
      }
      continue;
    }

    if (body.length === 0) {
      errors.push(
        `[lint] ${filePath}: H2 section "${range.name}" is empty. Use "${EMPTY_SENTINEL}" for empty sections.`
      );
    }
  }

  // Finding ID uniqueness.
  const idCounts = new Map();
  for (const match of contents.replace(HTML_COMMENT, '').matchAll(FINDING_ID_MARKER)) {
    const id = match[1];
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      warnings.push(
        `[lint] ${filePath}: finding ID "${id}" appears ${count} times. IDs should be globally unique.`
      );
    }
  }

  return { filePath, errors, warnings };
}

/**
 * @param {string} filePath
 * @returns {LintResult}
 */
export function lintReviewReportFile(filePath) {
  const contents = readFileSync(filePath, 'utf8');
  return lintReviewReportContent(contents, filePath);
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/opsx/review-report-lint.mjs <path> [<path> ...]');
    process.exit(2);
  }
  let hadError = false;
  for (const filePath of args) {
    const result = lintReviewReportFile(filePath);
    if (result.errors.length === 0 && result.warnings.length === 0) {
      process.stdout.write(`✓ ${filePath}\n`);
      continue;
    }
    hadError = hadError || result.errors.length > 0;
    for (const err of result.errors) {
      process.stderr.write(`✗ ${err}\n`);
    }
    for (const warn of result.warnings) {
      process.stderr.write(`! ${warn}\n`);
    }
  }
  process.exit(hadError ? 1 : 0);
}
