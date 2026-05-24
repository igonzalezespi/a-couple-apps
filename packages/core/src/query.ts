import { QueryClient } from '@tanstack/react-query';

/** Create the app's TanStack Query client with sane shared defaults. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false
      }
    }
  });
}
