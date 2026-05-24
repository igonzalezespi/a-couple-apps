#!/usr/bin/env node
// @ts-check
/* eslint-disable security/detect-unsafe-regex -- bounded quantifiers (\d{1,6}, fixed-length groups) are backtracking-safe; safe-regex false positive */

/**
 * Helper for .opsx-state.json — the per-change lifecycle state file
 * consumed by /opsx:propose, /opsx:apply, /opsx:verify, /opsx:archive.
 *
 * Schema: openspec/schemas/opsx-state.schema.json (draft-07).
 *
 * Usage (programmatic):
 *   import { readState, writeState, validateState } from './state.mjs';
 *   const state = readState(changeDir);
 *   writeState(changeDir, { verifiedAt: new Date().toISOString() });
 *
 * Usage (CLI):
 *   node scripts/opsx/state.mjs read <changeDir>
 *   node scripts/opsx/state.mjs init <changeDir> <changeName>
 *   node scripts/opsx/state.mjs validate <path-to-.opsx-state.json>
 *   node scripts/opsx/state.mjs set <changeDir> <json-patch>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const STATE_FILE_NAME = '.opsx-state.json';
export const SCHEMA_VERSION = 1;

/** @typedef {'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED' | 'BLOCKED_LOOP' | 'RECONSTRUCTED'} VerifyStatus */

/**
 * @typedef {object} DeferredIssueRef
 * @property {string} id
 * @property {number} number
 * @property {string} url
 * @property {string} findingId
 */

/**
 * @typedef {object} OpsxState
 * @property {number} schemaVersion
 * @property {string} changeName
 * @property {string} createdAt
 * @property {string | null} proposedAt
 * @property {string | null} reviewedAt
 * @property {boolean} reviewWaived
 * @property {string | null} [reviewWaiveReason]
 * @property {string | null} appliedAt
 * @property {string | null} verifiedAt
 * @property {VerifyStatus | null} verifyStatus
 * @property {number} verifyIterations
 * @property {string | null} lastVerifyReportPath
 * @property {string | null} archivedAt
 * @property {string | null} prUrl
 * @property {number | null} prNumber
 * @property {DeferredIssueRef[]} deferredIssues
 * @property {DeferredIssueRef[]} manualActionIssues
 */

const VALID_STATUSES = new Set([
  'READY',
  'READY_WITH_WARNINGS',
  'BLOCKED',
  'BLOCKED_LOOP',
  'RECONSTRUCTED'
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})$/;
const KEBAB = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

/**
 * Create a fresh default state object for a new change.
 *
 * @param {string} changeName
 * @param {string} [nowIso]
 * @returns {OpsxState}
 */
export function createDefaultState(changeName, nowIso = new Date().toISOString()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    changeName,
    createdAt: nowIso,
    proposedAt: nowIso,
    reviewedAt: null,
    reviewWaived: false,
    reviewWaiveReason: null,
    appliedAt: null,
    verifiedAt: null,
    verifyStatus: null,
    verifyIterations: 0,
    lastVerifyReportPath: null,
    archivedAt: null,
    prUrl: null,
    prNumber: null,
    deferredIssues: [],
    manualActionIssues: []
  };
}

/**
 * Validate a state object against the schema.
 *
 * @param {unknown} state
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateState(state) {
  /** @type {string[]} */
  const errors = [];

  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    errors.push('state must be a non-array object');
    return { valid: false, errors };
  }
  const s = /** @type {Record<string, unknown>} */ (state);

  if (s.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${SCHEMA_VERSION}, got ${String(s.schemaVersion)}`);
  }
  if (typeof s.changeName !== 'string' || !KEBAB.test(s.changeName)) {
    errors.push('changeName must be a kebab-case string');
  }
  if (typeof s.createdAt !== 'string' || !ISO_DATE.test(s.createdAt)) {
    errors.push('createdAt must be an ISO-8601 timestamp');
  }

  for (const field of /** @type {const} */ ([
    'proposedAt',
    'reviewedAt',
    'appliedAt',
    'verifiedAt',
    'archivedAt'
  ])) {
    const v = s[field];
    if (v !== null && (typeof v !== 'string' || !ISO_DATE.test(v))) {
      errors.push(`${field} must be null or an ISO-8601 timestamp`);
    }
  }

  if (typeof s.reviewWaived !== 'boolean') {
    errors.push('reviewWaived must be boolean');
  }
  if (
    s.reviewWaiveReason !== undefined &&
    s.reviewWaiveReason !== null &&
    typeof s.reviewWaiveReason !== 'string'
  ) {
    errors.push('reviewWaiveReason must be null, string, or unset');
  }

  if (
    s.verifyStatus !== null &&
    (typeof s.verifyStatus !== 'string' || !VALID_STATUSES.has(s.verifyStatus))
  ) {
    errors.push(
      `verifyStatus must be null or one of ${[...VALID_STATUSES].join(', ')}; got ${String(s.verifyStatus)}`
    );
  }
  if (
    typeof s.verifyIterations !== 'number' ||
    !Number.isInteger(s.verifyIterations) ||
    s.verifyIterations < 0
  ) {
    errors.push('verifyIterations must be a non-negative integer');
  }
  if (s.lastVerifyReportPath !== null && typeof s.lastVerifyReportPath !== 'string') {
    errors.push('lastVerifyReportPath must be null or a string');
  }
  if (s.prUrl !== null && typeof s.prUrl !== 'string') {
    errors.push('prUrl must be null or a string');
  }
  if (
    s.prNumber !== null &&
    (typeof s.prNumber !== 'number' || !Number.isInteger(s.prNumber) || s.prNumber < 1)
  ) {
    errors.push('prNumber must be null or a positive integer');
  }
  for (const arrayField of /** @type {const} */ (['deferredIssues', 'manualActionIssues'])) {
    const value = s[arrayField];
    if (!Array.isArray(value)) {
      errors.push(`${arrayField} must be an array`);
      continue;
    }
    value.forEach((entry, idx) => {
      if (!entry || typeof entry !== 'object') {
        errors.push(`${arrayField}[${idx}] must be an object`);
        return;
      }
      const e = /** @type {Record<string, unknown>} */ (entry);
      if (typeof e.id !== 'string') errors.push(`${arrayField}[${idx}].id must be a string`);
      if (typeof e.number !== 'number' || !Number.isInteger(e.number) || e.number < 1) {
        errors.push(`${arrayField}[${idx}].number must be a positive integer`);
      }
      if (typeof e.url !== 'string') errors.push(`${arrayField}[${idx}].url must be a string`);
      if (typeof e.findingId !== 'string') {
        errors.push(`${arrayField}[${idx}].findingId must be a string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Read and validate the state file for a change.
 *
 * Throws if the file exists but fails validation — callers handle the
 * "corrupt state" diagnostic upstream. Returns null if the file is
 * missing (caller decides whether to initialize or fail).
 *
 * @param {string} changeDir
 * @returns {OpsxState | null}
 */
export function readState(changeDir) {
  const path = join(changeDir, STATE_FILE_NAME);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `[opsx-state] ${path}: invalid JSON — ${error instanceof Error ? error.message : String(error)}`,
      { cause: error }
    );
  }
  const validation = validateState(parsed);
  if (!validation.valid) {
    throw new Error(
      `[opsx-state] ${path}: schema violation:\n  - ${validation.errors.join('\n  - ')}`
    );
  }
  return /** @type {OpsxState} */ (parsed);
}

/**
 * Initialize a fresh state file for a change if none exists. Idempotent:
 * if one already exists, it is read and returned unchanged.
 *
 * @param {string} changeDir
 * @param {string} changeName
 * @returns {OpsxState}
 */
export function initState(changeDir, changeName) {
  const existing = readState(changeDir);
  if (existing) return existing;
  const fresh = createDefaultState(changeName);
  writeStateDirect(changeDir, fresh);
  return fresh;
}

/**
 * Merge-patch an existing state file. Throws if no state file exists
 * (call initState first).
 *
 * @param {string} changeDir
 * @param {Partial<OpsxState>} patch
 * @returns {OpsxState} The merged + validated state, after writing.
 */
export function writeState(changeDir, patch) {
  const existing = readState(changeDir);
  if (!existing) {
    throw new Error(
      `[opsx-state] ${changeDir}: cannot patch missing state file. Call initState first.`
    );
  }
  const merged = { ...existing, ...patch };
  writeStateDirect(changeDir, merged);
  return merged;
}

/**
 * @param {string} changeDir
 * @param {OpsxState} state
 */
function writeStateDirect(changeDir, state) {
  const validation = validateState(state);
  if (!validation.valid) {
    throw new Error(
      `[opsx-state] refusing to write invalid state to ${changeDir}:\n  - ${validation.errors.join('\n  - ')}`
    );
  }
  const path = join(changeDir, STATE_FILE_NAME);
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  const [, , command, ...rest] = process.argv;
  try {
    if (command === 'read') {
      const [changeDir] = rest;
      if (!changeDir) throw new Error('Usage: state.mjs read <changeDir>');
      const state = readState(changeDir);
      if (!state) {
        process.stderr.write(`no state file at ${changeDir}\n`);
        process.exit(2);
      }
      process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    } else if (command === 'init') {
      const [changeDir, changeName] = rest;
      if (!changeDir || !changeName)
        throw new Error('Usage: state.mjs init <changeDir> <changeName>');
      const state = initState(changeDir, changeName);
      process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    } else if (command === 'validate') {
      const [filePath] = rest;
      if (!filePath) throw new Error('Usage: state.mjs validate <path-to-.opsx-state.json>');
      const raw = readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const result = validateState(parsed);
      if (!result.valid) {
        process.stderr.write(`✗ invalid\n  - ${result.errors.join('\n  - ')}\n`);
        process.exit(1);
      }
      process.stdout.write(`✓ valid\n`);
    } else if (command === 'set') {
      const [changeDir, patchJson] = rest;
      if (!changeDir || !patchJson)
        throw new Error('Usage: state.mjs set <changeDir> <json-patch>');
      const patch = JSON.parse(patchJson);
      const state = writeState(changeDir, patch);
      process.stdout.write(`${JSON.stringify(state, null, 2)}\n`);
    } else {
      process.stderr.write(
        `Unknown command "${command || ''}".\n` +
          `Usage:\n` +
          `  state.mjs read <changeDir>\n` +
          `  state.mjs init <changeDir> <changeName>\n` +
          `  state.mjs validate <path-to-.opsx-state.json>\n` +
          `  state.mjs set <changeDir> '<json-patch>'\n`
      );
      process.exit(2);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
