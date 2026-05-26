export {
  LANGUAGES,
  languageSchema,
  accentColorSchema,
  personSchema,
  themeOverridesSchema,
  sharedConfigSchema,
  appConfigSchema,
  coupleConfigSchema,
  type Language,
  type AccentColor,
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
export {
  SENSITIVE_ENV_VARS,
  envSchema,
  parseEnv,
  supabaseEnvSchema,
  parseSupabaseEnv,
  redact,
  EnvError,
  type Env,
  type SupabaseClientEnv
} from './env';
