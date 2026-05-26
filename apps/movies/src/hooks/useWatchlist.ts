import { useEffect } from 'react';

import {
  subscribeCoupleChannel,
  useCurrentPerson,
  useMutation,
  useQuery,
  useQueryClient,
  useSupabase
} from '@aca/core';

import { watchlistItemContract, type NewWatchlistItem, type WatchlistItem } from '../lib/watchlist';

const SCHEMA = 'movies';
const TABLE = 'watchlist_items';
// Prefixed with the table name so realtime change events invalidate it (see
// `invalidateForTable` in @aca/core).
const WATCHLIST_QUERY_KEY = [TABLE] as const;
// One self-hosted Supabase project per couple, so there is no couple id; this is just a
// stable channel label. Postgres-change events are delivered per subscription regardless.
const WATCHLIST_CHANNEL_ID = 'movies-watchlist';

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
        // The pick (at most one) floats to the top; then the rest newest-first.
        .order('picked_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return watchlistItemContract.array().parse(data ?? []);
    }
  });
}

/** Add a movie, attributed to the current person (no auth; identity is the selected person). */
export function useAddToWatchlist() {
  const client = useSupabase();
  const { person } = useCurrentPerson();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: NewWatchlistItem): Promise<void> => {
      const { error } = await client
        .schema(SCHEMA)
        .from(TABLE)
        .insert({ ...item, ...(person ? { added_by: person.id } : {}) });
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

/** Set or clear the shared "tonight's pick". Setting one clears any other (enforced by a DB trigger). */
export function useSetTonightPick() {
  const client = useSupabase();
  const { person } = useCurrentPerson();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pick }: { id: string; pick: boolean }): Promise<void> => {
      const values =
        pick && person
          ? { picked_at: new Date().toISOString(), picked_by: person.id }
          : { picked_at: null, picked_by: null };
      const { error } = await client.schema(SCHEMA).from(TABLE).update(values).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: WATCHLIST_QUERY_KEY })
  });
}

/**
 * Keep the watchlist in sync across both partners: subscribe to realtime changes in the
 * `movies` schema and invalidate the `['watchlist_items']` query on any change.
 * Unsubscribes on unmount.
 */
export function useWatchlistRealtime(): void {
  const client = useSupabase();
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = subscribeCoupleChannel(client, {
      coupleId: WATCHLIST_CHANNEL_ID,
      queryClient,
      schema: SCHEMA
    });
    return () => {
      void client.removeChannel(channel);
    };
  }, [client, queryClient]);
}
