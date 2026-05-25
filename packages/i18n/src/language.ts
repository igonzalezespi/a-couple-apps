import { LANGUAGES, type Language } from '@aca/config';

function isLanguage(value: string | undefined): value is Language {
  return value !== undefined && (LANGUAGES as readonly string[]).includes(value);
}

/** Normalize a BCP-47-ish locale (`es-ES`, `es_ES`, `ES`) to a supported Language, or undefined. */
export function normalizeLocale(locale: string | undefined): Language | undefined {
  if (!locale) return undefined;
  const base = locale.split(/[-_]/)[0]?.toLowerCase();
  return isLanguage(base) ? base : undefined;
}

export interface ResolveLanguageOptions {
  /** Explicit in-app user choice (highest priority). */
  user?: Language | undefined;
  /** `couple.config` defaultLanguage. */
  configDefault?: Language | undefined;
  /** Device/OS locale, e.g. expo-localization `getLocales()[0].languageTag` (supplied by the app). */
  deviceLocale?: string | undefined;
}

/**
 * Resolve the effective language. Precedence:
 * explicit user setting, then couple.config default, then device locale, then `en`.
 */
export function resolveLanguage(options: ResolveLanguageOptions = {}): Language {
  const { user, configDefault, deviceLocale } = options;
  if (isLanguage(user)) return user;
  if (isLanguage(configDefault)) return configDefault;
  return normalizeLocale(deviceLocale) ?? 'en';
}
