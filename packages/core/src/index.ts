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
