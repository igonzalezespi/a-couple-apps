/**
 * `@aca/core` -- the single data boundary (only importer of `@supabase/supabase-js`).
 *
 * Schema typing is generic: this package exports `BaseDatabase` (the cross-app `public` +
 * `shared` schemas only) and the generic `createSupabaseClient<DB>` / `AppSupabaseClient<DB>` /
 * `useSupabase<DB>()`, all defaulting to `BaseDatabase`. A per-app schema is NOT defined here --
 * an app composes `<App>Database = BaseDatabase & { <schema>: {...} }` and passes it to the
 * generic hook so `client.schema(...)` is typed (see `apps/movies/src/lib/database.ts` and the
 * "Adding an app" recipe in `ARCHITECTURE.md`). `Database` remains as a deprecated alias of
 * `BaseDatabase` for back-compat.
 */
import { type BaseDatabase } from './types';

export {
  createSupabaseClient,
  type AppSupabaseClient,
  type SupabaseEnv,
  type CreateSupabaseClientOptions
} from './client';
export { type BaseDatabase } from './types';

/** @deprecated Use `BaseDatabase` (apps compose their own schema on top). Kept for back-compat. */
export type Database = BaseDatabase;
export { createQueryClient } from './query';
export { CoreProvider, useSupabase, type CoreProviderProps } from './provider';
export {
  PersonProvider,
  useCurrentPerson,
  type Person,
  type PersonStorage,
  type CurrentPersonState,
  type PersonProviderProps
} from './person';
export { invalidateForTable, subscribeCoupleChannel, type CoupleChannelOptions } from './realtime';

// Re-export TanStack Query so apps share one instance/types via @aca/core.
export {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
