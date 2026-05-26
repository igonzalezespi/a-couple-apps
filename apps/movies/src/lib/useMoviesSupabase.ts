import { useSupabase } from '@aca/core';

import { type MoviesDatabase } from './database';

/**
 * The Supabase client typed for this app's `movies` schema. A thin binding of the generic core
 * hook so the watchlist hooks get `client.schema('movies')` typed without each call passing the
 * generic. Side-effect-free (no client creation) so it is safe to import in tests; the actual
 * client comes from the provider, not this module.
 */
export const useMoviesSupabase = () => useSupabase<MoviesDatabase>();
