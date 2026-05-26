import { type i18n as I18nInstance } from 'i18next';

import { type Language } from '@aca/config';
import { createI18n, registerAppNamespace, useAppLocale } from '@aca/i18n';

import { en } from './en';
import { es } from './es';

/** This app's i18next namespace. Registered with the shared `common` as `fallbackNS`. */
export const MOVIES_NS = 'movies';

/**
 * Create the i18next instance for the movies app: the shared `@aca/i18n` instance with this app's
 * `movies` namespace registered. Single source of truth for both `_layout` (app startup) and the
 * test render helper, so tests resolve the movies strings exactly as the app does.
 */
export function createMoviesI18n(language: Language): I18nInstance {
  const instance = createI18n(language);
  registerAppNamespace(instance, MOVIES_NS, { en, es });
  return instance;
}

/**
 * Locale accessor bound to the `movies` namespace. Resolves movies keys first and falls back to
 * `common` (the shared shell strings) via `fallbackNS`, so a component mixing both needs only this
 * hook. `language` / `setLanguage` are namespace-independent (same as the shared `useLocale`).
 */
export const useMoviesLocale = () => useAppLocale(MOVIES_NS);
