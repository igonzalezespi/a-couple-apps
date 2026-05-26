import { describe, expect, it } from 'vitest';

import { ACCENT_PALETTES, accentOverrides, baseThemes, createCoupleTheme } from './theme';

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

  it('applies an onPrimary override to both light and dark', () => {
    const theme = createCoupleTheme({ onPrimary: '#FFFFFF' });
    expect(theme.light.onPrimary).toBe('#FFFFFF');
    expect(theme.dark.onPrimary).toBe('#FFFFFF');
  });
});

describe('accent palettes', () => {
  it('accentOverrides returns the palette primary + onPrimary for a known color', () => {
    expect(accentOverrides('red')).toEqual({
      primary: ACCENT_PALETTES.red.primary,
      onPrimary: ACCENT_PALETTES.red.onPrimary
    });
    expect(accentOverrides('purple').primary).toBe(ACCENT_PALETTES.purple.primary);
  });

  it('accentOverrides is empty when no color is given', () => {
    expect(accentOverrides()).toEqual({});
  });

  it('createCoupleTheme applies an accent as primary + onPrimary on both schemes', () => {
    const theme = createCoupleTheme(accentOverrides('purple'));
    expect(theme.light.primary).toBe(ACCENT_PALETTES.purple.primary);
    expect(theme.dark.primary).toBe(ACCENT_PALETTES.purple.primary);
    expect(theme.light.onPrimary).toBe(ACCENT_PALETTES.purple.onPrimary);
  });
});
