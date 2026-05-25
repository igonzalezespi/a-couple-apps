import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGES, type Language } from '@aca/config';

/** Access translations + the current language, and switch language at runtime. */
export function useLocale() {
  const { t, i18n } = useTranslation();
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
