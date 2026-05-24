import { describe, expect, it } from 'vitest';

import { normalizeLocale, resolveLanguage } from './language';

describe('resolveLanguage precedence', () => {
  it('prefers the explicit user setting', () => {
    expect(resolveLanguage({ user: 'es', configDefault: 'en', deviceLocale: 'en-US' })).toBe('es');
  });

  it('falls back to the couple.config default', () => {
    expect(resolveLanguage({ configDefault: 'es', deviceLocale: 'en-US' })).toBe('es');
  });

  it('falls back to the device locale', () => {
    expect(resolveLanguage({ deviceLocale: 'es-ES' })).toBe('es');
  });

  it('defaults to en when nothing resolves or device is unsupported', () => {
    expect(resolveLanguage()).toBe('en');
    expect(resolveLanguage({ deviceLocale: 'fr-FR' })).toBe('en');
  });
});

describe('normalizeLocale', () => {
  it('extracts and lowercases the base language', () => {
    expect(normalizeLocale('es-ES')).toBe('es');
    expect(normalizeLocale('EN_us')).toBe('en');
  });

  it('returns undefined for unsupported or empty input', () => {
    expect(normalizeLocale('fr')).toBeUndefined();
    expect(normalizeLocale('')).toBeUndefined();
    expect(normalizeLocale(undefined)).toBeUndefined();
  });
});
