import { defineCoupleConfig } from '@aca/config';

/**
 * Upstream ships NEUTRAL PLACEHOLDERS only — no real personal data in source.
 * Fork it: copy `couple.config.example.ts` over this file and fill in your couple.
 */
export default defineCoupleConfig({
  config: {
    people: [
      { id: 'personA', displayName: 'Person A' },
      { id: 'personB', displayName: 'Person B' }
    ],
    defaultLanguage: 'en',
    theme: {}
  },
  movies: { enabled: true },
  plans: { enabled: true }
});
