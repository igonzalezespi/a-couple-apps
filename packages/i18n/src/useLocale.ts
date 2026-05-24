import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGES, type Language } from '@aca/config';

/** Access translations + the current language, and switch language at runtime. */
export function useLocale() {
  const { t, i18n } = useTranslation();
  const setLanguage = useCallback((language: Language) => i18n.changeLanguage(language), [i18n]);
  return {
    t,
    language: i18n.language as Language,
    languages: LANGUAGES,
    setLanguage
  };
}
