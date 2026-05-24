export {
  LANGUAGES,
  languageSchema,
  personSchema,
  themeOverridesSchema,
  sharedConfigSchema,
  appConfigSchema,
  coupleConfigSchema,
  type Language,
  type Person,
  type ThemeOverrides,
  type SharedConfig,
  type AppConfig,
  type CoupleConfig,
  type CoupleConfigInput
} from './schema';
export {
  CoupleConfigError,
  defineCoupleConfig,
  loadCoupleConfig,
  getSharedConfig,
  getAppConfig
} from './load';
export { SENSITIVE_ENV_VARS, envSchema, parseEnv, redact, EnvError, type Env } from './env';
