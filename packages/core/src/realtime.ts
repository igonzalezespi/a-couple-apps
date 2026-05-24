import { type RealtimeChannel } from '@supabase/supabase-js';
import { type QueryClient } from '@tanstack/react-query';

import { type AppSupabaseClient } from './client';

/**
 * Invalidate the queries affected by a realtime change to `table`. Query keys
 * are expected to be prefixed with the table name (e.g. `['profiles', id]`).
 */
export function invalidateForTable(queryClient: QueryClient, table: string): void {
  void queryClient.invalidateQueries({ queryKey: [table] });
}

export interface CoupleChannelOptions {
  coupleId: string;
  queryClient: QueryClient;
  /** Postgres schema to watch (defaults to the shared schema). */
  schema?: string;
}

/**
 * Subscribe to a couple-scoped realtime channel. Any change in the watched
 * schema invalidates the matching query cache so both users stay in sync
 * without a manual refresh. Returns the channel (unsubscribe on unmount).
 */
export function subscribeCoupleChannel(
  client: AppSupabaseClient,
  { coupleId, queryClient, schema = 'shared' }: CoupleChannelOptions
): RealtimeChannel {
  const channel = client.channel(`couple:${coupleId}`);
  channel
    .on('postgres_changes', { event: '*', schema }, (payload) => {
      invalidateForTable(queryClient, payload.table);
    })
    .subscribe();
  return channel;
}
