import studioBase from '@studio/eslint-config/base';

/** Relative imports that reach into another workspace package. */
export const crossPackagePatterns = [
  {
    group: ['**/packages/*', '**/packages/*/**', '**/apps/*', '**/apps/*/**'],
    message:
      'Do not import across workspace packages with relative paths. Use the @aca/* workspace alias.'
  }
];

/**
 * A Couple Apps ESLint base config.
 *
 * Thin wrapper over the studio shared base (`@studio/eslint-config/base`, which
 * carries the TS + security + sonarjs + jsdoc + Prettier core). This file adds
 * only the repo-specific workspace boundary policy the shared base deliberately
 * omits: apps depend on packages; packages never depend on apps; cross-package
 * imports use the `@aca/*` alias (never relative paths); and apps never import
 * `@supabase/supabase-js` directly (they go through `@aca/core`).
 */
export default [
  ...studioBase,
  {
    rules: {
      // sonarjs/no-unused-vars (new via the studio base) duplicates
      // @typescript-eslint/no-unused-vars, which this repo already runs with the
      // `^_` ignore convention. The sonarjs copy does not honour `^_`, so it
      // errors on idiomatic omit-by-destructure bindings (`const { x: _omitted,
      // ...rest } = o`). Defer to the TS-aware rule (sonarjs recommends this).
      'sonarjs/no-unused-vars': 'off',
      'no-restricted-imports': ['error', { patterns: crossPackagePatterns }]
    }
  },
  {
    // Apps consume data through @aca/core; never the Supabase SDK directly.
    files: ['apps/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: crossPackagePatterns,
          paths: [
            {
              name: '@supabase/supabase-js',
              message:
                'Apps must use @aca/core for data access, not @supabase/supabase-js directly.'
            }
          ]
        }
      ]
    }
  }
];
