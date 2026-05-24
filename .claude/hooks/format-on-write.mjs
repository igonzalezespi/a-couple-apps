#!/usr/bin/env node
// PostToolUse(Edit|Write) hook: format + autofix the edited file with the
// repo's prettier/eslint when they are installed. Never blocks (always exits 0).
// Reads the Claude Code hook payload (JSON on stdin) to find the file path.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

let file;
try {
  file = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.file_path;
} catch {
  process.exit(0);
}

if (!file || !existsSync(file)) process.exit(0);
if (!/\.(ts|tsx|mjs|cjs|js|json|yml|yaml)$/.test(file)) process.exit(0);
// Skip ported / authored-as-is areas (mirror .prettierignore + eslint ignores).
if (/(^|\/)(node_modules|\.claude|dist|\.expo|coverage)(\/|$)/.test(file)) process.exit(0);
if (/\/(scripts\/opsx|openspec)\//.test(file)) process.exit(0);

const bin = (name) => `node_modules/.bin/${name}`;
const run = (name, args) => {
  if (!existsSync(bin(name))) return;
  try {
    execFileSync(bin(name), args, { stdio: 'ignore' });
  } catch {
    // Non-fatal: never block the tool call on a formatting/lint hiccup.
  }
};

run('prettier', ['--write', '--log-level', 'warn', file]);
if (/\.(ts|tsx|mjs|cjs|js)$/.test(file)) run('eslint', ['--fix', '--no-warn-ignored', file]);

process.exit(0);
