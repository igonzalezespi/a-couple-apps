import { defineCoupleConfig } from '@aca/config';

/**
 * Fork this for your own couple:
 *   1. cp couple.config.example.ts couple.config.ts
 *   2. cp .env.example .env        (Supabase + TMDB secrets — never committed)
 *   3. Fill in your two people, language, optional theme, and enabled apps.
 *
 * No secrets live here — those go in `.env`. No real personal data ships upstream.
 */
export default defineCoupleConfig({
  config: {
    people: [
      // `color` is each person's favorite accent (red | purple); the app re-skins to whoever is
      // the active person. Optional -- omit it to use the couple-wide theme below.
      { id: 'personA', displayName: 'Person A', color: 'red' },
      { id: 'personB', displayName: 'Person B', color: 'purple' }
    ],
    defaultLanguage: 'en',
    // Optional couple-wide re-skin (used when a person has no `color`); no packages/ui edit needed.
    theme: {
      // primary: '#5B8DEF',
      // accent: '#E8A23D'
    }
  },
  movies: { enabled: true },
  plans: { enabled: true }
});
