import { Stack } from 'expo-router';

import { getSharedConfig } from '@aca/config';
import { createI18n, I18nProvider, resolveLanguage } from '@aca/i18n';
import { createUIConfig, UIProvider } from '@aca/ui';

import coupleConfig from '../../../couple.config';

// Built once at startup. Device-locale wiring lands with auth/expo-localization.
const shared = getSharedConfig(coupleConfig);
const uiConfig = createUIConfig(shared.theme);
const i18n = createI18n(resolveLanguage({ configDefault: shared.defaultLanguage }));

export default function RootLayout() {
  return (
    <UIProvider config={uiConfig} defaultTheme="light">
      <I18nProvider i18n={i18n}>
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </UIProvider>
  );
}
