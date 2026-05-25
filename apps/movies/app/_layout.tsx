import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { getSharedConfig } from '@aca/config';
import { CoreProvider, createQueryClient } from '@aca/core';
import { createI18n, I18nProvider, resolveLanguage } from '@aca/i18n';
import { createUIConfig, UIProvider } from '@aca/ui';

import coupleConfig from '../../../couple.config';
import { SessionGate } from '../src/auth/SessionGate';
import { supabase } from '../src/lib/supabase';

// Built once at startup. `createUIConfig(shared.theme)` re-skins the app from
// couple.config (verified end-to-end: theme.primary drives component colors).
// Device-locale wiring lands with auth/expo-localization.
const shared = getSharedConfig(coupleConfig);
const uiConfig = createUIConfig(shared.theme);
const i18n = createI18n(resolveLanguage({ configDefault: shared.defaultLanguage }));
const queryClient = createQueryClient();

export default function RootLayout() {
  // Honor the OS appearance (app.config sets userInterfaceStyle: 'automatic'); the token
  // set ships a full dark theme. Falls back to light when the scheme is null/unknown.
  const colorScheme = useColorScheme();
  return (
    <UIProvider config={uiConfig} defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}>
      <I18nProvider i18n={i18n}>
        <CoreProvider client={supabase} queryClient={queryClient}>
          <SessionGate>
            <Stack screenOptions={{ headerShown: false }} />
          </SessionGate>
        </CoreProvider>
      </I18nProvider>
    </UIProvider>
  );
}
