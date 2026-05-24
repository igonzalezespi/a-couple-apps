import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { type Language } from '@aca/config';

import { en } from './locales/en';
import { es } from './locales/es';

export const DEFAULT_NS = 'common';

export const resources = {
  en: { common: en },
  es: { common: es }
} as const;

/**
 * Create an isolated i18next instance configured for this app's locales.
 * Call once at app startup (module scope or a root `useMemo`) and pass the
 * instance to `<I18nProvider>` — do not recreate it on every render.
 */
export function createI18n(language: Language): I18nInstance {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    defaultNS: DEFAULT_NS,
    ns: [DEFAULT_NS],
    resources,
    interpolation: { escapeValue: false },
    returnNull: false,
    // Inline resources are ready synchronously; no Suspense boundary needed in apps.
    react: { useSuspense: false }
  });
  return instance;
}
