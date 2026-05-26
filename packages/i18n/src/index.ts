/**
 * `@aca/i18n` -- shared i18n: the `common` namespace (shell strings) + language switching.
 *
 * Namespaces are app-owned. This package ships only `common` (the `defaultNS` and `fallbackNS`
 * set in `createI18n`); it carries no app's strings. An app registers its own namespace on the
 * shared instance via `registerAppNamespace(instance, ns, { en, es })` and binds a hook with the
 * generic `useAppLocale(ns)` (returning `{ t, language, languages, setLanguage }`). Because
 * `common` is the `fallbackNS`, an app hook resolves the app's keys first and falls through to the
 * shared shell strings. See `apps/movies/src/i18n/` and the "Adding an app" recipe in
 * `ARCHITECTURE.md`. Guard each locale with a per-namespace key type (e.g. `CommonTranslationKey`).
 */
export { normalizeLocale, resolveLanguage, type ResolveLanguageOptions } from './language';
export { resolveExternalLang } from './external';
export { en, type CommonTranslationKey } from './locales/en';
export { es } from './locales/es';
export {
  createI18n,
  registerAppNamespace,
  resources,
  DEFAULT_NS,
  type AppNamespaceBundles
} from './i18n';
export { useLocale, useAppLocale } from './useLocale';
export { I18nProvider, type I18nProviderProps } from './provider';
