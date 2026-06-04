import studioExpo from '@studio/eslint-config/expo';

import { crossPackagePatterns } from './base.mjs';

/**
 * ESLint config for Expo apps.
 *
 * Thin wrapper over the studio shared Expo preset (`@studio/eslint-config/expo`,
 * which composes eslint-config-expo + Prettier). It intentionally does NOT
 * spread the studio base: Expo's flat config already registers the
 * typescript-eslint / react / react-native plugins, so spreading base would
 * trigger ESLint's "plugin redefined" conflict. We add only the repo-specific
 * workspace boundary (a core rule, no plugin needed).
 */
export default [
  ...studioExpo,
  {
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
