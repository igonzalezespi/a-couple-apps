import expo from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';

import { crossPackagePatterns } from './base.mjs';

/**
 * ESLint config for Expo apps: eslint-config-expo (React Native rules) plus our
 * workspace boundaries. We add only *rules* on top of Expo's flat config (which
 * already registers the typescript-eslint/react/react-native plugins) to avoid
 * the "plugin redefined" conflict that spreading our base would cause.
 */
export default [
  ...expo,
  {
    rules: {
      // eslint-config-expo already provides the typescript-eslint rules; we add
      // only the workspace boundary (a core rule, no plugin needed).
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
