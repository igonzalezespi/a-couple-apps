import { describe, expect, it } from 'vitest';

import coupleConfig from '../../../couple.config';
import { getSharedConfig } from './index';

describe('committed couple.config.ts', () => {
  it('loads and validates (defineCoupleConfig did not throw on import)', () => {
    expect(getSharedConfig(coupleConfig).defaultLanguage).toBeDefined();
  });

  it('ships only neutral placeholder people — no real personal data upstream', () => {
    for (const person of getSharedConfig(coupleConfig).people) {
      expect(person.id).toMatch(/^person[AB]$/);
      expect(person.displayName).toMatch(/^Person [AB]$/);
    }
  });
});
