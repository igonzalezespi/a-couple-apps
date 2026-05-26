import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';

import { type AppSupabaseClient } from './client';
import { type BaseDatabase } from './types';

const SupabaseContext = createContext<AppSupabaseClient | null>(null);

export interface CoreProviderProps {
  client: AppSupabaseClient;
  queryClient: QueryClient;
  children: ReactNode;
}

/** Provides the Supabase client + TanStack Query client to `@aca/core` hooks. */
export function CoreProvider({ client, queryClient, children }: CoreProviderProps) {
  return (
    <SupabaseContext.Provider value={client}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SupabaseContext.Provider>
  );
}

/**
 * Access the Supabase client from context (must be inside `<CoreProvider>`).
 *
 * Generic over the database shape so an app reads it as its own typed client, e.g.
 * `useSupabase<MoviesDatabase>()` keeps `client.schema('movies')` typed. The React
 * context cannot carry a per-consumer generic (it holds the base `AppSupabaseClient`),
 * so the return is cast to the requested shape. The `unknown` bridge is required: a
 * direct `as AppSupabaseClient<DB>` fails TS2352 because the schema-name unions of the
 * base and `DB` clients differ structurally.
 */
export function useSupabase<DB extends BaseDatabase = BaseDatabase>(): AppSupabaseClient<DB> {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error('useSupabase must be used within <CoreProvider>');
  }
  return client as unknown as AppSupabaseClient<DB>;
}
