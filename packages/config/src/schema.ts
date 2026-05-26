import { z } from 'zod';

/** Supported UI + external-data languages. */
export const LANGUAGES = ['en', 'es'] as const;
export const languageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof languageSchema>;

/** A person's favorite accent color; drives the app theme while they are the active person. */
export const accentColorSchema = z.enum(['red', 'purple']);
export type AccentColor = z.infer<typeof accentColorSchema>;

/** One member of the couple. */
export const personSchema = z.object({
  id: z.string().min(1, 'person.id must not be empty'),
  displayName: z.string().min(1, 'person.displayName must not be empty'),
  color: accentColorSchema.optional()
});
export type Person = z.infer<typeof personSchema>;

/** Optional palette overrides; shape matches `@aca/ui` ThemeOverrides. */
export const themeOverridesSchema = z
  .object({
    primary: z.string().optional(),
    accent: z.string().optional()
  })
  .optional();
export type ThemeOverrides = z.infer<typeof themeOverridesSchema>;

/** Shared (cross-app) configuration: the two people, default language, theme. */
export const sharedConfigSchema = z.object({
  people: z.tuple([personSchema, personSchema]),
  defaultLanguage: languageSchema,
  theme: themeOverridesSchema
});
export type SharedConfig = z.infer<typeof sharedConfigSchema>;

/** Per-app section: at least `enabled`; apps may extend with their own fields. */
export const appConfigSchema = z.object({ enabled: z.boolean() }).catchall(z.unknown());
export type AppConfig = z.infer<typeof appConfigSchema>;

/** Full `couple.config.ts` shape: `{ config: <shared>, <appName>: <appConfig>, ... }`. */
export const coupleConfigSchema = z
  .object({ config: sharedConfigSchema })
  .catchall(appConfigSchema);
export type CoupleConfig = z.infer<typeof coupleConfigSchema>;

/**
 * Authoring shape for `couple.config.ts`. Used as the `defineCoupleConfig`
 * constraint so object literals get contextual typing (the people tuple and the
 * language enum infer correctly without `as const`). App sections are typed
 * loosely (`SharedConfig | AppConfig`) so the `config` key satisfies the index
 * signature; the runtime `coupleConfigSchema` is the authoritative validator.
 */
export type CoupleConfigInput = {
  config: SharedConfig;
  [appName: string]: SharedConfig | AppConfig;
};
