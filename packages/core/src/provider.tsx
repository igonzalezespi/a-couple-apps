import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';

import { type AppSupabaseClient } from './client';

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

/** Access the Supabase client from context (must be inside `<CoreProvider>`). */
export function useSupabase(): AppSupabaseClient {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error('useSupabase must be used within <CoreProvider>');
  }
  return client;
}
