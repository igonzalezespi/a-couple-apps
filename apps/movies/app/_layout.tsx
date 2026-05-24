import { Stack } from 'expo-router';

import { getSharedConfig } from '@aca/config';
import { createI18n, I18nProvider, resolveLanguage } from '@aca/i18n';
import { UIProvider } from '@aca/ui';

import coupleConfig from '../../../couple.config';

// Resolve the language once at startup (device locale wiring lands with auth/expo-localization).
const language = resolveLanguage({ configDefault: getSharedConfig(coupleConfig).defaultLanguage });
const i18n = createI18n(language);

export default function RootLayout() {
  return (
    <UIProvider defaultTheme="light">
      <I18nProvider i18n={i18n}>
        <Stack screenOptions={{ headerShown: false }} />
      </I18nProvider>
    </UIProvider>
  );
}
