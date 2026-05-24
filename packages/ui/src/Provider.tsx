import { TamaguiProvider, type TamaguiProviderProps } from '@tamagui/core';

import { config as defaultConfig } from '../tamagui.config';

export type UIProviderProps = Omit<TamaguiProviderProps, 'config' | 'defaultTheme'> & {
  /** Defaults to `'light'`. */
  defaultTheme?: TamaguiProviderProps['defaultTheme'];
  /** Tamagui config; pass `createUIConfig(coupleTheme)` to apply overrides. Defaults to the base config. */
  config?: TamaguiProviderProps['config'];
};

/**
 * Wraps the app in the Tamagui config so every `@aca/ui` primitive resolves the
 * same tokens/themes on iOS, Android, and web. Pass a `config` built with
 * `createUIConfig(overrides)` to apply couple.config theme overrides.
 */
export function UIProvider({
  children,
  defaultTheme = 'light',
  config = defaultConfig,
  ...rest
}: UIProviderProps) {
  return (
    <TamaguiProvider config={config} defaultTheme={defaultTheme} {...rest}>
      {children}
    </TamaguiProvider>
  );
}
