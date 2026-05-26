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
