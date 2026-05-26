import { z } from 'zod';

/**
 * Contract for a `movies.watchlist_items` row. Supabase responses are validated
 * against this at the data boundary (per-app contract; `@aca/core` holds only the
 * shared ones).
 */
export const watchlistItemContract = z.object({
  id: z.uuid(),
  tmdb_id: z.number().int(),
  title: z.string(),
  poster_path: z.string().nullable(),
  release_date: z.string().nullable(),
  watched: z.boolean(),
  // The person id (from couple.config) who added it; no auth, so it's a config id, not a UUID.
  // Nullable to tolerate rows added before the no-auth migration.
  added_by: z.string().nullable(),
  // Tonight's pick: both set together (a person id + when) or both null; at most one row is set.
  picked_at: z.string().nullable(),
  picked_by: z.string().nullable(),
  created_at: z.string()
});

export type WatchlistItem = z.infer<typeof watchlistItemContract>;

/** Fields the app supplies when adding a movie; everything else defaults in Postgres. */
export interface NewWatchlistItem {
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
}
