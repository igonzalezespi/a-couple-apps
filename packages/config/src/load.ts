import {
  coupleConfigSchema,
  type CoupleConfig,
  type CoupleConfigInput,
  type SharedConfig
} from './schema';

/** Thrown when `couple.config.ts` fails schema validation. */
export class CoupleConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CoupleConfigError';
  }
}

type Issue = { path: PropertyKey[]; message: string };

function formatIssues(issues: Issue[]): string {
  return issues
    .map((issue) => `  - ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

/** Validate an unknown value as a couple config, throwing a readable error. */
export function loadCoupleConfig(raw: unknown): CoupleConfig {
  const result = coupleConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new CoupleConfigError(`Invalid couple.config.ts:\n${formatIssues(result.error.issues)}`);
  }
  return result.data;
}

/**
 * Typed authoring helper for `couple.config.ts`: gives editor inference while
 * authoring and validates the config when the module is imported.
 */
export function defineCoupleConfig<T extends CoupleConfigInput>(config: T): T {
  loadCoupleConfig(config);
  return config;
}

/** The shared (cross-app) config block. */
export function getSharedConfig<T extends CoupleConfigInput>(config: T): SharedConfig {
  return config.config;
}

/** A single app's config section (typed by key). */
export function getAppConfig<T extends CoupleConfigInput, K extends Exclude<keyof T, 'config'>>(
  config: T,
  app: K
): T[K] {
  return config[app];
}
