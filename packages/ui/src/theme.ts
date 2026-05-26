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
  onPrimary?: string | undefined;
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
    ...(overrides.accent ? { accent: overrides.accent } : {}),
    ...(overrides.onPrimary ? { onPrimary: overrides.onPrimary } : {})
  });
  return { light: apply(light), dark: apply(dark) };
}

/**
 * Named accent palettes a person can pick (couple.config `color`). Extensible -- the keys are the
 * values the config and UI agree on. Each sets `primary` (the most visible re-skin) plus a
 * readable `onPrimary` for text on it.
 */
export const ACCENT_PALETTES = {
  red: { primary: '#E5484D', onPrimary: '#FFFFFF' },
  purple: { primary: '#8E4EC6', onPrimary: '#FFFFFF' }
} as const;

/** A favorite accent color a person may choose. */
export type AccentColor = keyof typeof ACCENT_PALETTES;

/** Theme overrides for a person's accent color; empty when unset or unknown. */
export function accentOverrides(color?: AccentColor): ThemeOverrides {
  if (color && color in ACCENT_PALETTES) {
    const { primary, onPrimary } = ACCENT_PALETTES[color];
    return { primary, onPrimary };
  }
  return {};
}

/**
 * The full theme map for the Tamagui config: base `light`/`dark` (with optional couple-wide
 * overrides) plus a `${scheme}_${accent}` sub-theme per accent color. One config holds them all,
 * so the active person's color re-skins the app at runtime by switching the active theme NAME
 * (Tamagui's runtime-safe path) -- no config rebuild, no multiple `createTamagui` calls.
 */
export function buildThemes(overrides: ThemeOverrides = {}): Record<string, CoupleThemeColors> {
  const base = createCoupleTheme(overrides);
  const themes: Record<string, CoupleThemeColors> = { light: base.light, dark: base.dark };
  for (const accent of Object.keys(ACCENT_PALETTES) as AccentColor[]) {
    const { primary, onPrimary } = ACCENT_PALETTES[accent];
    themes[`light_${accent}`] = { ...base.light, primary, onPrimary };
    themes[`dark_${accent}`] = { ...base.dark, primary, onPrimary };
  }
  return themes;
}
