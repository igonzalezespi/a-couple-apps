import { type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { useCurrentPerson } from '@aca/core';
import { UIProvider, type Conf } from '@aca/ui';

/**
 * Re-skins the app to the current person's favorite color by switching the active Tamagui theme
 * NAME (`${scheme}_${color}`, e.g. `light_red`). One config holds every theme, so this is a
 * runtime theme switch -- not a config rebuild, and no multiple `createTamagui` calls. Falls back
 * to the plain scheme before a person is chosen or when they have no color. Must sit inside
 * `<PersonProvider>`; honors the OS color scheme.
 */
export function PersonThemedUIProvider({
  config,
  children
}: {
  config: Conf;
  children: ReactNode;
}) {
  const { person } = useCurrentPerson();
  const scheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = person?.color ? `${scheme}_${person.color}` : scheme;
  return (
    <UIProvider config={config} defaultTheme={theme}>
      {children}
    </UIProvider>
  );
}
