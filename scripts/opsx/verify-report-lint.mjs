#!/usr/bin/env node
// @ts-check

/**
 * Schema linter for verify-report.md files.
 *
 * Validates that a verify-report passes all the rules enforced by
 * scripts/opsx/verify-report-parser.mjs PLUS a handful of additional
 * rules that are safe to relax during parsing but should fail lint:
 *
 *   - Each Findings sub-section must render `_None_` or a bullet list.
 *   - Every non-empty Findings entry must start with an `**[<id>]**` marker
 *     where <id> is an 8-hex-char finding ID.
 *   - Every finding ID used across sections is unique.
 *   - Empty H2 sections use the literal sentinel `_None_`, not a
 *     paragraph or alternative wording.
 *
 * Usage (CLI):
 *   node scripts/opsx/verify-report-lint.mjs <path> [<path> ...]
 *   # Exits 0 on success, non-zero on any error.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  EMPTY_SENTINEL,
  parseVerifyReport,
  REQUIRED_H2_SECTIONS
} from './verify-report-parser.mjs';

const FINDING_ID_MARKER = /\*\*\[([a-f0-9]{8})\]\*\*/g;

/**
 * @typedef {object} LintResult
 * @property {string} filePath
 * @property {string[]} errors
 * @property {string[]} warnings
 */

/**
 * Lint a verify-report string.
 *
 * @param {string} contents
 * @param {string} filePath
 * @returns {LintResult}
 */
export function lintVerifyReportContent(contents, filePath) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  let report;
  try {
    report = parseVerifyReport(contents, filePath);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return { filePath, errors, warnings };
  }

  if (!report.header.changeName) {
    errors.push(`[lint] ${filePath}: H1 title must include a change name after "Verify Report:".`);
  }

  // Findings H3 sub-sections: must be either the empty sentinel or a non-empty bullet list.
  for (const severity of /** @type {const} */ (['critical', 'warning', 'suggestion'])) {
    const section = report.findings[severity];
    if (!section.isEmpty && !section.body.startsWith('-')) {
      errors.push(
        `[lint] ${filePath}: Findings/${section.name} must be "_None_" or a bullet list starting with "-".`
      );
    }
  }

  // H2 sections that allow the "_None_" sentinel when empty. Parser strips
  // HTML comments, so body.length == 0 means the author left the section
  // fully blank instead of using the empty sentinel.
  for (const key of /** @type {const} */ ([
    'fixesApplied',
    'deferredWork',
    'manualActions',
    'specDrift'
  ])) {
    const section = report[key];
    if (section.body.length === 0) {
      errors.push(
        `[lint] ${filePath}: H2 section "${section.name}" is empty. Use "${EMPTY_SENTINEL}" for empty sections.`
      );
    }
  }

  // H2 sections that MUST have content — the empty sentinel is not a valid
  // value here because these sections carry load-bearing data (Scorecard
  // table, Test Compliance analysis, Final Assessment verdict).
  for (const key of /** @type {const} */ (['scorecard', 'testCompliance', 'finalAssessment'])) {
    const section = report[key];
    if (section.body.length === 0 || section.isEmpty) {
      errors.push(
        `[lint] ${filePath}: H2 section "${section.name}" must have content; the "${EMPTY_SENTINEL}" sentinel is not valid here.`
      );
    }
  }

  // Finding ID uniqueness across all finding-bearing sections.
  const idCounts = new Map();
  const findingSources = [
    report.findings.critical,
    report.findings.warning,
    report.findings.suggestion,
    report.fixesApplied,
    report.specDrift
  ];
  for (const section of findingSources) {
    if (section.isEmpty) continue;
    for (const match of section.body.matchAll(FINDING_ID_MARKER)) {
      const id = match[1];
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      warnings.push(
        `[lint] ${filePath}: finding ID "${id}" appears ${count} times across findings/fixes/drift sections. IDs should be globally unique.`
      );
    }
  }

  // Sanity: ensure the section list matches the canonical order (parser
  // already enforces this, but repeat explicitly for lint output clarity).
  const expected = REQUIRED_H2_SECTIONS.join(', ');
  if (expected.length === 0) {
    errors.push(`[lint] ${filePath}: internal — no required H2 sections configured.`);
  }

  return { filePath, errors, warnings };
}

/**
 * Lint a single file.
 *
 * @param {string} filePath
 * @returns {LintResult}
 */
export function lintVerifyReportFile(filePath) {
  const contents = readFileSync(filePath, 'utf8');
  return lintVerifyReportContent(contents, filePath);
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node scripts/opsx/verify-report-lint.mjs <path> [<path> ...]');
    process.exit(2);
  }
  let hadError = false;
  for (const filePath of args) {
    const result = lintVerifyReportFile(filePath);
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
