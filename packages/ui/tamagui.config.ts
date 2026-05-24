import { createFont, createTamagui, createTokens } from '@tamagui/core';

import { createCoupleTheme } from './src/theme';

// Themes carry semantic color keys ($background, $color, $primary, ...).
const themes = createCoupleTheme();

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

export const config = createTamagui({
  tokens,
  themes,
  fonts: { body: bodyFont, heading: bodyFont },
  defaultFont: 'body'
});

export type Conf = typeof config;

declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends Conf {}
}
