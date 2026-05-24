import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { type Env } from '@aca/config';

import { type Database } from './types';

export type AppSupabaseClient = SupabaseClient<Database>;

/** The env subset the Supabase client needs (from `@aca/config` parseEnv). */
export type SupabaseEnv = Pick<Env, 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>;

/** Options forwarded to `createClient` (e.g. `auth.storage` for native persistence). */
export type CreateSupabaseClientOptions = Parameters<typeof createClient<Database>>[2];

/**
 * Create the typed Supabase client. Call once at app startup with parsed env
 * (see `@aca/config` parseEnv). This is the only place the client is created;
 * apps consume it through `@aca/core` hooks, never `@supabase/supabase-js`.
 *
 * On native, pass `{ auth: { storage: AsyncStorage } }` so the session persists
 * (web uses localStorage by default).
 */
export function createSupabaseClient(
  env: SupabaseEnv,
  options?: CreateSupabaseClientOptions
): AppSupabaseClient {
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    ...options,
    auth: { persistSession: true, autoRefreshToken: true, ...options?.auth }
  });
}
