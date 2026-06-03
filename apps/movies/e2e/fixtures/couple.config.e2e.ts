import { defineCoupleConfig } from '@aca/config';

/**
 * Fixed couple config for the hermetic web e2e build. The Playwright webServer aliases the app's
 * `couple.config` import to THIS file (via metro.config.js, gated on ACA_E2E=1), so the exported
 * bundle never bakes in a developer's private `couple.config.ts`. The spec reads the person names
 * from this same module (see movies.spec.ts), keeping a single source of truth and the test
 * decoupled from any local config.
 *
 * Mirrors `couple.config.example.ts` so a clean clone (CI) and a developer with a private config
 * exercise identical text.
 */
export default defineCoupleConfig({
  config: {
    people: [
      { id: 'personA', displayName: 'Person A', color: 'red' },
      { id: 'personB', displayName: 'Person B', color: 'purple' }
    ],
    defaultLanguage: 'en'
  },
  movies: { enabled: true },
  plans: { enabled: true }
});
