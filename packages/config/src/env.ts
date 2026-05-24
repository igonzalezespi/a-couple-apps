import { z } from 'zod';

/** Secret-bearing env var names that must never be logged. */
export const SENSITIVE_ENV_VARS = ['SUPABASE_ANON_KEY', 'TMDB_API_KEY'] as const;

/** Required runtime environment. Secrets live here, never in `couple.config.ts`. */
export const envSchema = z.object({
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  TMDB_API_KEY: z.string().min(1, 'TMDB_API_KEY is required')
});
export type Env = z.infer<typeof envSchema>;

/** Thrown when the environment is missing or invalid. */
export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

/** Validate the environment, throwing a readable error naming the missing var(s). */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.map(String).join('.')}: ${issue.message}`
    );
    throw new EnvError(
      `Invalid environment (copy .env.example to .env and fill it in):\n${lines.join('\n')}`
    );
  }
  return result.data;
}

/** Mask a value when its env var name is sensitive — for safe logging. */
export function redact(name: string, value: string | undefined): string {
  if (value === undefined) return '(unset)';
  return (SENSITIVE_ENV_VARS as readonly string[]).includes(name) ? '***' : value;
}
