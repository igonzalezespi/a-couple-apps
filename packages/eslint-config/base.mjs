import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/** Relative imports that reach into another workspace package. */
const crossPackagePatterns = [
  {
    group: ['**/packages/*', '**/packages/*/**', '**/apps/*', '**/apps/*/**'],
    message:
      'Do not import across workspace packages with relative paths. Use the @aca/* workspace alias.'
  }
];

/**
 * Shared flat ESLint config for A Couple Apps.
 *
 * Boundary rules: apps depend on packages; packages never depend on apps;
 * cross-package imports use the `@aca/*` workspace alias (never relative paths);
 * and apps never import `@supabase/supabase-js` directly (they use `@aca/core`).
 */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Allow `interface X extends Y {}` — used for module augmentation (e.g. Tamagui config types).
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' }
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-imports': ['error', { patterns: crossPackagePatterns }]
    }
  },
  {
    // Apps consume data through @aca/core — never the Supabase SDK directly.
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
  },
  prettier
];
