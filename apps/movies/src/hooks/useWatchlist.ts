import { useMutation, useQuery, useQueryClient, useSupabase } from '@aca/core';

import { watchlistItemContract, type NewWatchlistItem, type WatchlistItem } from '../lib/watchlist';

const SCHEMA = 'movies';
const TABLE = 'watchlist_items';
// Prefixed with the table name so realtime change events invalidate it (see
// `invalidateForTable` in @aca/core).
const WATCHLIST_QUERY_KEY = [TABLE] as const;

/** The shared watchlist, newest first. */
export function useWatchlist() {
  const client = useSupabase();
  return useQuery({
    queryKey: WATCHLIST_QUERY_KEY,
    queryFn: async (): Promise<WatchlistItem[]> => {
      const { data, error } = await client
        .schema(SCHEMA)
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return watchlistItemContract.array().parse(data ?? []);
    }
  });
}

/** Add a movie. `added_by` defaults to the current user in Postgres. */
export function useAddToWatchlist() {
  const client = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: NewWatchlistItem): Promise<void> => {
      const { error } = await client.schema(SCHEMA).from(TABLE).insert(item);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY })
  });
}

/** Remove an item from the shared watchlist. */
export function useRemoveFromWatchlist() {
  const client = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await client.schema(SCHEMA).from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY })
  });
}

/** Mark an item watched / unwatched. */
export function useSetWatched() {
  const client = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, watched }: { id: string; watched: boolean }): Promise<void> => {
      const { error } = await client.schema(SCHEMA).from(TABLE).update({ watched }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY })
  });
}
