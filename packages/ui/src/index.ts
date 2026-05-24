export { config, createUIConfig, type Conf } from '../tamagui.config';
export {
  baseThemes,
  createCoupleTheme,
  type CoupleTheme,
  type CoupleThemeColors,
  type ThemeOverrides
} from './theme';
export {
  Button,
  type ButtonProps,
  Card,
  Input,
  type InputProps,
  Screen,
  Text,
  XStack,
  YStack
} from './components';
export { UIProvider, type UIProviderProps } from './Provider';

// Re-export the core escape hatches so apps never import @tamagui/core directly.
export { styled, Theme, useTheme, getTokens, getTokenValue } from '@tamagui/core';
