#!/usr/bin/env node
// @ts-check

/**
 * Reader for openspec/project.md configuration.
 *
 * project.md uses a single fenced YAML block (```yaml ... ```) for all
 * verify / archive / manual-check config knobs. This helper parses that
 * block without pulling in a YAML dependency — we only need a tiny subset
 * of YAML (mappings, lists, booleans, numbers, strings).
 *
 * Usage (programmatic):
 *   import { readProjectConfig, getThresholds } from './project-config.mjs';
 *   const cfg = readProjectConfig();
 *   const thresholds = cfg.verify.thresholds;
 *
 * Usage (CLI):
 *   node scripts/opsx/project-config.mjs read
 *   node scripts/opsx/project-config.mjs get verify.thresholds.requirement_coverage_min
 */
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const DEFAULT_PROJECT_MD_PATH = 'openspec/project.md';

/**
 * @typedef {object} VerifyThresholds
 * @property {number} requirement_coverage_min
 * @property {number} scenario_coverage_min
 * @property {boolean} block_on_missing_report
 */

/**
 * @typedef {object} VerifyTriage
 * @property {number} max_iterations
 * @property {number} auto_fix_max_loc_per_change
 * @property {string[]} rules
 */

/**
 * @typedef {object} VerifyArchive
 * @property {boolean} create_deferred_issues
 * @property {boolean} require_review_before_apply
 * @property {number} deferred_issue_batch_prompt_threshold
 */

/**
 * @typedef {object} VerifyConfig
 * @property {VerifyThresholds} thresholds
 * @property {VerifyTriage} triage
 * @property {VerifyArchive} archive
 */

/**
 * @typedef {object} ManualCheckConfig
 * @property {string} library_path
 * @property {boolean} prefer_library_reference
 */

/**
 * @typedef {object} ProjectConfig
 * @property {VerifyConfig} verify
 * @property {ManualCheckConfig} manual_checks
 */

const DEFAULT_CONFIG = /** @type {ProjectConfig} */ ({
  verify: {
    thresholds: {
      requirement_coverage_min: 0.8,
      scenario_coverage_min: 0.7,
      block_on_missing_report: false
    },
    triage: {
      max_iterations: 3,
      auto_fix_max_loc_per_change: 150,
      rules: [
        'critical_incomplete_task_with_evidence',
        'critical_missing_implementation_single_file_small',
        'warning_spec_divergence_code_correct',
        'warning_scenario_uncovered_test_file_exists',
        'suggestion_pattern_deviation_single_line',
        'suggestion_missing_why_comment_small_scope'
      ]
    },
    archive: {
      create_deferred_issues: true,
      require_review_before_apply: true,
      deferred_issue_batch_prompt_threshold: 5
    }
  },
  manual_checks: {
    library_path: 'openspec/manual-checks',
    prefer_library_reference: true
  }
});

/**
 * Read the project.md configuration. Returns DEFAULT_CONFIG if the file is
 * missing so commands stay resilient in fresh checkouts. Throws on parse
 * failure to surface malformed config early.
 *
 * @param {string} [filePath] Defaults to `openspec/project.md` relative to cwd.
 * @returns {ProjectConfig}
 */
export function readProjectConfig(filePath = DEFAULT_PROJECT_MD_PATH) {
  if (!existsSync(filePath)) return structuredClone(DEFAULT_CONFIG);
  const contents = readFileSync(filePath, 'utf8');
  const yamlBlock = extractYamlBlock(contents, filePath);
  if (yamlBlock === null) return structuredClone(DEFAULT_CONFIG);
  const parsed = parseMiniYaml(yamlBlock, filePath);
  return mergeDefaults(parsed);
}

/**
 * Resolve a dot-path into the config object (`verify.thresholds.requirement_coverage_min`).
 *
 * @param {ProjectConfig} config
 * @param {string} dottedPath
 * @returns {unknown}
 */
export function getConfigValue(config, dottedPath) {
  const segments = dottedPath.split('.');
  /** @type {unknown} */
  let node = config;
  for (const segment of segments) {
    if (node === null || typeof node !== 'object') return undefined;
    node = /** @type {Record<string, unknown>} */ (node)[segment];
  }
  return node;
}

/**
 * Extract the first fenced ```yaml block from project.md. Falls back to
 * null when no block exists.
 *
 * @param {string} contents
 * @param {string} filePath
 */
function extractYamlBlock(contents, filePath) {
  const match = contents.match(/```yaml\n([\s\S]*?)\n```/);
  if (!match) return null;
  if (!match[1]) throw new Error(`[project-config] ${filePath}: empty yaml block`);
  return match[1];
}

/**
 * Tiny YAML subset parser: mappings, nested mappings, bullet lists, bools,
 * numbers (int/float), quoted and unquoted strings. Comments start with `#`.
 * Enough for project.md — not a general YAML parser.
 *
 * @param {string} src
 * @param {string} filePath
 * @returns {Record<string, unknown>}
 */
function parseMiniYaml(src, filePath) {
  const rawLines = src.split('\n');
  /** @type {Array<{ indent: number, raw: string, lineNo: number }>} */
  const lines = [];
  rawLines.forEach((raw, idx) => {
    const withoutComment = stripComment(raw);
    if (!withoutComment.trim()) return;
    const indent = withoutComment.length - withoutComment.trimStart().length;
    lines.push({ indent, raw: withoutComment.trimEnd(), lineNo: idx + 1 });
  });

  let cursor = 0;

  /**
   * @param {number} indent
   * @returns {Record<string, unknown> | unknown[]}
   */
  function parseBlock(indent) {
    /** @type {Record<string, unknown> | unknown[] | null} */
    let container = null;
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (!line || line.indent < indent) break;
      if (line.indent > indent) {
        throw new Error(
          `[project-config] ${filePath}:${line.lineNo}: unexpected indent ${line.indent} (expected ${indent})`
        );
      }
      const trimmed = line.raw.trim();
      if (trimmed.startsWith('- ')) {
        if (container === null) container = [];
        if (!Array.isArray(container)) {
          throw new Error(
            `[project-config] ${filePath}:${line.lineNo}: list item in non-list context`
          );
        }
        const itemSrc = trimmed.slice(2).trim();
        container.push(parseScalar(itemSrc));
        cursor += 1;
        continue;
      }
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) {
        throw new Error(
          `[project-config] ${filePath}:${line.lineNo}: expected "key: value" mapping`
        );
      }
      const key = trimmed.slice(0, colonIdx).trim();
      const rest = trimmed.slice(colonIdx + 1).trim();
      if (container === null) container = {};
      if (Array.isArray(container)) {
        throw new Error(
          `[project-config] ${filePath}:${line.lineNo}: mapping key inside list context`
        );
      }
      cursor += 1;
      if (rest.length > 0) {
        container[key] = parseScalar(rest);
        continue;
      }
      const next = lines[cursor];
      if (!next || next.indent <= indent) {
        container[key] = {};
        continue;
      }
      container[key] = parseBlock(next.indent);
    }
    return container ?? {};
  }

  const result = parseBlock(0);
  if (Array.isArray(result)) {
    throw new Error(`[project-config] ${filePath}: top-level block cannot be a list`);
  }
  return /** @type {Record<string, unknown>} */ (result);
}

/**
 * @param {string} line
 */
function stripComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === `'` && !inDouble) inSingle = !inSingle;
    else if (ch === `"` && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

/**
 * @param {string} raw
 * @returns {unknown}
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
 * Merge parsed config into DEFAULT_CONFIG so consumers always see the full
 * shape even if project.md omits a knob.
 *
 * @param {Record<string, unknown>} parsed
 * @returns {ProjectConfig}
 */
function mergeDefaults(parsed) {
  const clone = structuredClone(DEFAULT_CONFIG);
  deepMerge(clone, parsed);
  return clone;
}

/**
 * @param {Record<string, unknown>} target
 * @param {Record<string, unknown>} source
 */
function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof target[key] === 'object' &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      deepMerge(
        /** @type {Record<string, unknown>} */ (target[key]),
        /** @type {Record<string, unknown>} */ (value)
      );
    } else {
      target[key] = value;
    }
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const [, , command, ...rest] = process.argv;
  try {
    if (command === 'read') {
      const [filePath] = rest;
      const config = readProjectConfig(filePath);
      process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
    } else if (command === 'get') {
      const [dottedPath, filePath] = rest;
      if (!dottedPath) throw new Error('Usage: project-config.mjs get <dotted.path> [filePath]');
      const config = readProjectConfig(filePath);
      const value = getConfigValue(config, dottedPath);
      if (value === undefined) {
        process.stderr.write(`path not found: ${dottedPath}\n`);
        process.exit(2);
      }
      process.stdout.write(`${JSON.stringify(value)}\n`);
    } else {
      process.stderr.write(
        `Unknown command "${command || ''}".\n` +
          `Usage:\n` +
          `  project-config.mjs read [filePath]\n` +
          `  project-config.mjs get <dotted.path> [filePath]\n`
      );
      process.exit(2);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
