#!/usr/bin/env node
// @ts-check

/**
 * Linter for openspec/manual-checks/<id>.md recipe files.
 *
 * Validates front-matter and body structure per Requirement ManualCheckLibrary:
 *
 *   Front-matter (YAML):
 *     id: <string matching file name>
 *     category: visual | third-party | environment | secrets | human-judgment | hardware
 *     estimated_minutes: <positive integer>
 *     tools: [list of strings]
 *
 *   Body sections (H2):
 *     ## Steps
 *     ## Pass Criteria
 *     ## Why Agent Can't Verify
 *
 * Usage (CLI):
 *   node scripts/opsx/lint-manual-checks.mjs <path-or-dir> [<path-or-dir> ...]
 *   # Single files or directories. Directories are recursed one level for *.md files.
 *   # Skips README.md (the library index, not a recipe).
 *   # Exits 0 on success, non-zero on any error.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const VALID_CATEGORIES = new Set([
  'visual',
  'third-party',
  'environment',
  'secrets',
  'human-judgment',
  'hardware'
]);

const REQUIRED_H2_SECTIONS = /** @type {const} */ ([
  'Steps',
  'Pass Criteria',
  "Why Agent Can't Verify"
]);

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;
const H2_LINE = /^##\s+(.+)$/;

/**
 * @typedef {object} LintResult
 * @property {string} filePath
 * @property {string[]} errors
 * @property {string[]} warnings
 */

/**
 * @param {string} contents
 * @param {string} filePath
 * @returns {LintResult}
 */
export function lintManualCheckContent(contents, filePath) {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];

  const fmMatch = FRONT_MATTER.exec(contents);
  if (!fmMatch) {
    errors.push(`[lint] ${filePath}: missing YAML front-matter block (---\\n...---).`);
    return { filePath, errors, warnings };
  }
  const fmSrc = fmMatch[1];
  const body = contents.slice(fmMatch[0].length);

  const fm = parseFrontMatter(fmSrc, filePath, errors);
  if (errors.length > 0) return { filePath, errors, warnings };

  const expectedId = basename(filePath, extname(filePath));
  if (fm.id !== expectedId) {
    errors.push(
      `[lint] ${filePath}: front-matter id "${fm.id}" must equal the file basename "${expectedId}".`
    );
  }
  if (!fm.category || !VALID_CATEGORIES.has(String(fm.category))) {
    errors.push(
      `[lint] ${filePath}: front-matter category must be one of ${[...VALID_CATEGORIES].join(', ')}; got "${String(fm.category)}".`
    );
  }
  if (
    typeof fm.estimated_minutes !== 'number' ||
    !Number.isInteger(fm.estimated_minutes) ||
    fm.estimated_minutes <= 0
  ) {
    errors.push(
      `[lint] ${filePath}: front-matter estimated_minutes must be a positive integer; got ${String(fm.estimated_minutes)}.`
    );
  }
  if (!Array.isArray(fm.tools) || fm.tools.some((item) => typeof item !== 'string')) {
    errors.push(`[lint] ${filePath}: front-matter tools must be an array of strings.`);
  }

  const bodyLines = body.split(/\r?\n/);
  const foundH2 = /** @type {string[]} */ ([]);
  for (const line of bodyLines) {
    const match = H2_LINE.exec(line);
    if (match) foundH2.push(match[1].trim());
  }

  const missing = REQUIRED_H2_SECTIONS.filter((name) => !foundH2.includes(name));
  if (missing.length > 0) {
    errors.push(`[lint] ${filePath}: missing H2 sections: ${missing.join(', ')}.`);
  }
  for (let i = 0; i < REQUIRED_H2_SECTIONS.length && i < foundH2.length; i += 1) {
    if (foundH2[i] !== REQUIRED_H2_SECTIONS[i]) {
      warnings.push(
        `[lint] ${filePath}: H2 sections out of order at position ${i}: expected "${REQUIRED_H2_SECTIONS[i]}", got "${foundH2[i]}".`
      );
      break;
    }
  }

  return { filePath, errors, warnings };
}

/**
 * @param {string} filePath
 * @returns {LintResult}
 */
export function lintManualCheckFile(filePath) {
  const contents = readFileSync(filePath, 'utf8');
  return lintManualCheckContent(contents, filePath);
}

/**
 * Tiny front-matter parser (YAML subset: scalars, simple lists).
 *
 * @param {string} src
 * @param {string} filePath
 * @param {string[]} errors
 * @returns {Record<string, unknown>}
 */
function parseFrontMatter(src, filePath, errors) {
  /** @type {Record<string, unknown>} */
  const result = {};
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) {
      errors.push(`[lint] ${filePath}:${i + 1}: expected "key: value" in front-matter.`);
      continue;
    }
    const key = raw.slice(0, colonIdx).trim();
    const value = raw.slice(colonIdx + 1).trim();
    result[key] = parseScalar(value);
  }
  return result;
}

/**
 * @param {string} raw
 */
function parseScalar(raw) {
  const value = raw.trim();
  if (value === '') return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((item) => parseScalar(item.trim()));
  }
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return Number.parseFloat(value);
  return value;
}

/**
 * @param {string} path
 * @returns {string[]}
 */
function expandPaths(path) {
  let stats;
  try {
    stats = statSync(path);
  } catch {
    return [];
  }
  if (stats.isFile()) return [path];
  if (!stats.isDirectory()) return [];
  const entries = readdirSync(path, { withFileTypes: true });
  /** @type {string[]} */
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    if (!entry.name.endsWith('.md')) continue;
    if (entry.name === 'README.md') continue;
    files.push(join(path, entry.name));
  }
  return files.sort();
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      'Usage: node scripts/opsx/lint-manual-checks.mjs <path-or-dir> [<path-or-dir> ...]'
    );
    process.exit(2);
  }
  /** @type {string[]} */
  const files = [];
  for (const input of args) {
    files.push(...expandPaths(input));
  }
  if (files.length === 0) {
    process.stderr.write('No .md recipe files found.\n');
    process.exit(2);
  }
  let hadError = false;
  for (const filePath of files) {
    const result = lintManualCheckFile(filePath);
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
