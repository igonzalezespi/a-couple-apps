import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGES, type Language } from '@aca/config';

import { DEFAULT_NS } from './i18n';

/**
 * Access translations bound to `namespace` plus the current language, and switch language at
 * runtime. `t` resolves keys from `namespace` first and falls back to `common` (the `fallbackNS`
 * set in `createI18n`), so a component mixing app + shell strings needs only this one accessor.
 * `language` / `languages` / `setLanguage` read/drive the i18n instance, so they are
 * namespace-independent (identical across every namespace and to `useLocale`).
 */
export function useAppLocale(namespace: string) {
  const { t, i18n } = useTranslation(namespace);
  const setLanguage = useCallback((language: Language) => i18n.changeLanguage(language), [i18n]);
  return {
    t,
    // Guard the cast: i18next.language is a plain string, so an unsupported value
    // (e.g. from a stored preference) would otherwise reach resolveExternalLang and
    // produce a broken TMDB locale. Fall back to the first supported language.
    language: (LANGUAGES as readonly string[]).includes(i18n.language)
      ? (i18n.language as Language)
      : 'en',
    languages: LANGUAGES,
    setLanguage
  };
}

/** Access shared `common` translations + the current language. Thin binding of `useAppLocale`. */
export function useLocale() {
  return useAppLocale(DEFAULT_NS);
}
