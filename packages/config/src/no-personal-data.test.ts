import { describe, expect, it } from 'vitest';

import exampleConfig from '../../../couple.config.example';
import { getSharedConfig } from './index';

// `couple.config.ts` is gitignored (per-instance; it may hold real names + colors), so the
// committed source of truth is the example. It MUST stay free of personal data.
describe('couple.config.example.ts (the committed template)', () => {
  it('loads and validates (defineCoupleConfig did not throw on import)', () => {
    expect(getSharedConfig(exampleConfig).defaultLanguage).toBeDefined();
  });

  it('ships only neutral placeholder people, no real personal data upstream', () => {
    for (const person of getSharedConfig(exampleConfig).people) {
      expect(person.id).toMatch(/^person[AB]$/);
      expect(person.displayName).toMatch(/^Person [AB]$/);
    }
  });
});
