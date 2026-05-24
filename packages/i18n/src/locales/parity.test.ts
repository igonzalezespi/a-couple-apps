import { describe, expect, it } from 'vitest';

import { en } from './en';
import { es } from './es';

describe('locale key parity', () => {
  it('en and es declare exactly the same keys (no missing translations)', () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it('every es value is a non-empty string', () => {
    for (const value of Object.values(es)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
