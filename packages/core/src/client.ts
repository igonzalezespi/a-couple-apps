import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { type Env } from '@aca/config';

import { type BaseDatabase } from './types';

/**
 * The typed Supabase client. Generic over the database shape, defaulting to
 * `BaseDatabase` so untyped callers compile unchanged; an app passes its own
 * database type (e.g. `MoviesDatabase`) to keep schema-qualified calls typed.
 */
export type AppSupabaseClient<DB extends BaseDatabase = BaseDatabase> = SupabaseClient<DB>;

/** The env subset the Supabase client needs (from `@aca/config` parseEnv). */
export type SupabaseEnv = Pick<Env, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>;

/**
 * Options forwarded to `createClient` (e.g. `auth.storage` for native persistence).
 * Schema-independent, so typed at the base default.
 */
export type CreateSupabaseClientOptions = Parameters<typeof createClient<BaseDatabase>>[2];

/**
 * Create the typed Supabase client. Call once at app startup with parsed env
 * (see `@aca/config` parseEnv). This is the only place the client is created;
 * apps consume it through `@aca/core` hooks, never `@supabase/supabase-js`.
 *
 * Pass the app's database type (`createSupabaseClient<MoviesDatabase>(env)`) so the
 * client is typed for the app's own schema; it defaults to `BaseDatabase`.
 *
 * On native, pass `{ auth: { storage: AsyncStorage } }` so the session persists
 * (web uses localStorage by default).
 */
export function createSupabaseClient<DB extends BaseDatabase = BaseDatabase>(
  env: SupabaseEnv,
  options?: CreateSupabaseClientOptions
): AppSupabaseClient<DB> {
  // Create at the concrete `BaseDatabase` so `createClient`'s options/schema inference resolves
  // (an unbounded `DB` makes the inferred `SupabaseClientOptions.db.schema` non-assignable under
  // exactOptionalPropertyTypes), then cast the result to the requested `DB`. The runtime client
  // is schema-agnostic -- schemas are just string keys -- so the cast only re-attaches the app's
  // static types; callers passing a concrete type still get a fully typed client. The `unknown`
  // bridge is required because the schema-name unions of `BaseDatabase` and `DB` differ (TS2352).
  const client = createClient<BaseDatabase>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...options,
    auth: { persistSession: true, autoRefreshToken: true, ...options?.auth }
  });
  return client as unknown as AppSupabaseClient<DB>;
}
