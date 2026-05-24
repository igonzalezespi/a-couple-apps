/**
 * Couple-themeable color sets. This is the single source of truth for the
 * palette both apps render from. `createCoupleTheme` merges optional overrides
 * (driven by `couple.config.ts`) so a fork can re-skin both apps without
 * touching `packages/ui`. Pure + framework-agnostic so it is trivially testable
 * and identical on every platform.
 */
export type CoupleThemeColors = {
  background: string;
  backgroundHover: string;
  color: string;
  colorMuted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  borderColor: string;
};

export type CoupleTheme = {
  light: CoupleThemeColors;
  dark: CoupleThemeColors;
};

/** Optional overrides surfaced through `couple.config.ts` (see @aca/config). */
export type ThemeOverrides = {
  primary?: string | undefined;
  accent?: string | undefined;
};

const light: CoupleThemeColors = {
  background: '#FFFFFF',
  backgroundHover: '#F2F4F7',
  color: '#0B1721',
  colorMuted: '#5B6B79',
  primary: '#5B8DEF',
  onPrimary: '#FFFFFF',
  accent: '#E8A23D',
  borderColor: '#E2E8F0'
};

const dark: CoupleThemeColors = {
  background: '#0B0B0C',
  backgroundHover: '#1A1C1E',
  color: '#ECEDEE',
  colorMuted: '#9BA1A6',
  primary: '#5B8DEF',
  onPrimary: '#0B0B0C',
  accent: '#E8A23D',
  borderColor: '#26292E'
};

/** The default palette with no overrides applied. */
export const baseThemes: CoupleTheme = { light, dark };

/**
 * Merge couple.config theme overrides into the base light/dark themes.
 * Absent overrides fall back to the defaults.
 */
export function createCoupleTheme(overrides: ThemeOverrides = {}): CoupleTheme {
  const apply = (base: CoupleThemeColors): CoupleThemeColors => ({
    ...base,
    ...(overrides.primary ? { primary: overrides.primary } : {}),
    ...(overrides.accent ? { accent: overrides.accent } : {})
  });
  return { light: apply(light), dark: apply(dark) };
}
