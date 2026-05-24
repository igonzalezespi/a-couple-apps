import { describe, expect, it } from 'vitest';

import { baseThemes, createCoupleTheme } from './theme';

describe('createCoupleTheme', () => {
  it('returns the base palette when no overrides are given', () => {
    const theme = createCoupleTheme();
    expect(theme.light.primary).toBe(baseThemes.light.primary);
    expect(theme.dark.primary).toBe(baseThemes.dark.primary);
  });

  it('applies a primary override to both light and dark', () => {
    const theme = createCoupleTheme({ primary: '#FF0055' });
    expect(theme.light.primary).toBe('#FF0055');
    expect(theme.dark.primary).toBe('#FF0055');
    // Non-overridden tokens stay at their defaults.
    expect(theme.light.background).toBe(baseThemes.light.background);
  });

  it('applies an accent override independently of primary', () => {
    const theme = createCoupleTheme({ accent: '#00CC88' });
    expect(theme.light.accent).toBe('#00CC88');
    expect(theme.light.primary).toBe(baseThemes.light.primary);
  });

  it('restores the default when the override is removed (no shared mutation)', () => {
    createCoupleTheme({ primary: '#FF0055' });
    const theme = createCoupleTheme();
    expect(theme.light.primary).toBe(baseThemes.light.primary);
  });
});
