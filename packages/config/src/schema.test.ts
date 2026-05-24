import { describe, expect, it } from 'vitest';

import {
  CoupleConfigError,
  defineCoupleConfig,
  getAppConfig,
  getSharedConfig,
  loadCoupleConfig
} from './index';

const people = [
  { id: 'a', displayName: 'A' },
  { id: 'b', displayName: 'B' }
];

describe('couple config schema', () => {
  it('loads a valid config', () => {
    const cfg = loadCoupleConfig({
      config: { people, defaultLanguage: 'es', theme: {} },
      movies: { enabled: true }
    });
    expect(cfg.config.defaultLanguage).toBe('es');
  });

  it('defineCoupleConfig validates and exposes typed accessors', () => {
    const cfg = defineCoupleConfig({
      config: {
        people: [
          { id: 'a', displayName: 'A' },
          { id: 'b', displayName: 'B' }
        ],
        defaultLanguage: 'en',
        theme: { primary: '#fff' }
      },
      movies: { enabled: true },
      plans: { enabled: false }
    });
    expect(getSharedConfig(cfg).people).toHaveLength(2);
    expect(getAppConfig(cfg, 'movies').enabled).toBe(true);
    expect(getAppConfig(cfg, 'plans').enabled).toBe(false);
  });

  it('rejects a missing required field, naming it', () => {
    const bad = { config: { people, theme: {} } };
    expect(() => loadCoupleConfig(bad)).toThrow(CoupleConfigError);
    expect(() => loadCoupleConfig(bad)).toThrow(/defaultLanguage/);
  });

  it('rejects an invalid language', () => {
    expect(() =>
      loadCoupleConfig({ config: { people, defaultLanguage: 'fr', theme: {} } })
    ).toThrow(/defaultLanguage/);
  });

  it('requires exactly two people', () => {
    expect(() =>
      loadCoupleConfig({
        config: { people: [{ id: 'a', displayName: 'A' }], defaultLanguage: 'en' }
      })
    ).toThrow(CoupleConfigError);
  });

  it('rejects an app section missing enabled', () => {
    expect(() =>
      loadCoupleConfig({ config: { people, defaultLanguage: 'en' }, movies: { foo: 1 } })
    ).toThrow(/enabled/);
  });
});
