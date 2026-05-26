import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getSharedConfig } from '@aca/config';
import { CoreProvider, createQueryClient, PersonProvider } from '@aca/core';
import { I18nProvider, resolveLanguage } from '@aca/i18n';
import { createUIConfig } from '@aca/ui';

import coupleConfig from '../../../couple.config';
import { createMoviesI18n } from '../src/i18n';
import { supabase } from '../src/lib/supabase';
import { PersonGate } from '../src/PersonGate';
import { PersonThemedUIProvider } from '../src/PersonThemedUIProvider';

const shared = getSharedConfig(coupleConfig);
// One Tamagui config holding the base light/dark plus a sub-theme per accent (light_red,
// dark_purple, ...). The active person's color selects the theme NAME at runtime (see
// PersonThemedUIProvider); couple.config `theme` still re-skins the base couple-wide.
const uiConfig = createUIConfig(shared.theme ?? {});
const i18n = createMoviesI18n(resolveLanguage({ configDefault: shared.defaultLanguage }));
const queryClient = createQueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider i18n={i18n}>
        <PersonProvider people={shared.people} storage={AsyncStorage}>
          <PersonThemedUIProvider config={uiConfig}>
            <CoreProvider client={supabase} queryClient={queryClient}>
              <PersonGate>
                <Stack screenOptions={{ headerShown: false }} />
              </PersonGate>
            </CoreProvider>
          </PersonThemedUIProvider>
        </PersonProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
