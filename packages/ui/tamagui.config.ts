import { createFont, createTamagui, createTokens } from '@tamagui/core';

import { buildThemes, type ThemeOverrides } from './src/theme';

// Tokens drive spacing, sizing, radii and the raw palette ($space, $size, ...).
const tokens = createTokens({
  color: {
    white: '#FFFFFF',
    black: '#000000',
    primary: '#5B8DEF',
    accent: '#E8A23D'
  },
  space: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, true: 8 },
  size: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, true: 16 },
  radius: { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, true: 8 },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300 }
});

const bodyFont = createFont({
  family: 'System',
  size: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 24, 7: 30, true: 16 },
  lineHeight: { 1: 16, 2: 20, 3: 22, 4: 26, 5: 28, 6: 32, 7: 38, true: 22 },
  weight: { 4: '400', 6: '600', 7: '700' },
  letterSpacing: { 4: 0 }
});

/**
 * Build the Tamagui config. `overrides` (from `couple.config.ts` `theme`) re-skin
 * both apps without editing this package; theme values resolve at runtime, so
 * passing an overridden config to `<UIProvider config>` re-themes the app.
 */
export function createUIConfig(overrides?: ThemeOverrides) {
  return createTamagui({
    tokens,
    themes: buildThemes(overrides),
    fonts: { body: bodyFont, heading: bodyFont },
    defaultFont: 'body'
  });
}

// The default (no-override) config; also read by the Tamagui Babel plugin.
export const config = createUIConfig();

export type Conf = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}
