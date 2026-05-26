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

/** en/es bundles for an app namespace, passed to `registerAppNamespace`. */
export interface AppNamespaceBundles {
  en: Record<string, string>;
  es: Record<string, string>;
}

/**
 * Create an isolated i18next instance configured for this app's locales.
 * Call once at app startup (module scope or a root `useMemo`) and pass the
 * instance to `<I18nProvider>`; do not recreate it on every render.
 *
 * `common` is the default namespace and `fallbackNS`, so a namespace-bound
 * accessor (see `useAppLocale`) resolves app keys first and falls back to the
 * shared `common` bundle for shell strings -- no per-key namespace routing.
 */
export function createI18n(language: Language): I18nInstance {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: 'en',
    defaultNS: DEFAULT_NS,
    fallbackNS: DEFAULT_NS,
    ns: [DEFAULT_NS],
    resources,
    interpolation: { escapeValue: false },
    returnNull: false,
    // Inline resources are ready synchronously; no Suspense boundary needed in apps.
    react: { useSuspense: false }
  });
  return instance;
}

/**
 * Register an app-owned namespace (its en/es bundles) on an instance from
 * `createI18n`. Lets an app add its strings without editing `@aca/i18n`; the
 * `common` `fallbackNS` set in `createI18n` then resolves shared keys reached
 * from this namespace. Call at app startup, before the screens render.
 */
export function registerAppNamespace(
  instance: I18nInstance,
  namespace: string,
  bundles: AppNamespaceBundles
): void {
  // `deep`/`overwrite` false: never clobber existing resources (e.g. a re-register
  // in a test). loadNamespaces makes the namespace resolvable on the active language.
  instance.addResourceBundle('en', namespace, bundles.en, false, false);
  instance.addResourceBundle('es', namespace, bundles.es, false, false);
  void instance.loadNamespaces(namespace);
}
