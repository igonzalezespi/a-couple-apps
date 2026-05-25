import { type Language } from '@aca/config';

/** App language to external-data provider locale (e.g. TMDB `language=es-ES`). */
const EXTERNAL_LANGUAGE: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES'
};

/** Map the configured app language to an external provider locale code. */
export function resolveExternalLang(language: Language): string {
  return EXTERNAL_LANGUAGE[language];
}
