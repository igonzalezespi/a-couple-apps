import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import baseConfig from './base.mjs';

const lintSnippet = async (code, filePath = 'packages/ui/src/example.ts') => {
  const eslint = new ESLint({ overrideConfigFile: true, baseConfig });
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => m.ruleId);
};

test('cross-package relative import is flagged by no-restricted-imports', async () => {
  const ruleIds = await lintSnippet(
    "import { thing } from '../../packages/core/src';\nexport const x = thing;\n"
  );
  assert.ok(
    ruleIds.includes('no-restricted-imports'),
    `expected a no-restricted-imports error, got: ${ruleIds.join(', ') || '(none)'}`
  );
});

test('@aca/* alias import is allowed', async () => {
  const ruleIds = await lintSnippet(
    "import { thing } from '@aca/core';\nexport const x = thing;\n"
  );
  assert.ok(
    !ruleIds.includes('no-restricted-imports'),
    'alias import must not trigger the boundary rule'
  );
});

test('apps may not import @supabase/supabase-js directly', async () => {
  const ruleIds = await lintSnippet(
    "import { createClient } from '@supabase/supabase-js';\nexport const x = createClient;\n",
    'apps/movies/src/data.ts'
  );
  assert.ok(
    ruleIds.includes('no-restricted-imports'),
    `expected the @supabase/supabase-js import to be restricted in apps, got: ${ruleIds.join(', ') || '(none)'}`
  );
});

test('packages may import @supabase/supabase-js (only @aca/core should)', async () => {
  const ruleIds = await lintSnippet(
    "import { createClient } from '@supabase/supabase-js';\nexport const x = createClient;\n",
    'packages/core/src/client.ts'
  );
  assert.ok(
    !ruleIds.includes('no-restricted-imports'),
    'packages must be allowed to import @supabase/supabase-js'
  );
});
