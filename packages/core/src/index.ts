export {
  createSupabaseClient,
  type AppSupabaseClient,
  type SupabaseEnv,
  type CreateSupabaseClientOptions
} from './client';
export { type Database } from './types';
export { profileContract, type Profile } from './contracts';
export { createQueryClient } from './query';
export { CoreProvider, useSupabase, type CoreProviderProps } from './provider';
export { useSession, signOut, type SessionState } from './auth';
export { invalidateForTable, subscribeCoupleChannel, type CoupleChannelOptions } from './realtime';

// Re-export TanStack Query so apps share one instance/types via @aca/core.
export {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
