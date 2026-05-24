import { TamaguiProvider, type TamaguiProviderProps } from '@tamagui/core';

import { config } from '../tamagui.config';

export type UIProviderProps = Omit<TamaguiProviderProps, 'config' | 'defaultTheme'> & {
  /** Defaults to `'light'`. */
  defaultTheme?: TamaguiProviderProps['defaultTheme'];
};

/**
 * Wraps the app in the shared Tamagui config so every `@aca/ui` primitive
 * resolves the same tokens/themes on iOS, Android, and web.
 */
export function UIProvider({ children, defaultTheme = 'light', ...rest }: UIProviderProps) {
  return (
    <TamaguiProvider config={config} defaultTheme={defaultTheme} {...rest}>
      {children}
    </TamaguiProvider>
  );
}
