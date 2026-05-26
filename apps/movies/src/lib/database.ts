import { type BaseDatabase } from '@aca/core';

type EmptyRecord = Record<string, never>;

/**
 * The movies app's Supabase database: the cross-app `BaseDatabase` (`public` + `shared`)
 * plus this app's own `movies` schema. Composed here (not in `@aca/core`) so adding an app
 * never edits the shared package; the app passes this type to the generic client/hook to keep
 * `client.schema('movies')` typed. Regenerate the `movies` block from the real project with
 * `supabase gen types typescript` once it grows.
 */
export type MoviesDatabase = BaseDatabase & {
  movies: {
    Tables: {
      watchlist_items: {
        Row: {
          id: string;
          tmdb_id: number;
          title: string;
          poster_path: string | null;
          release_date: string | null;
          watched: boolean;
          added_by: string | null;
          picked_at: string | null;
          picked_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tmdb_id: number;
          title: string;
          poster_path?: string | null;
          release_date?: string | null;
          watched?: boolean;
          added_by?: string | null;
          picked_at?: string | null;
          picked_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tmdb_id?: number;
          title?: string;
          poster_path?: string | null;
          release_date?: string | null;
          watched?: boolean;
          added_by?: string | null;
          picked_at?: string | null;
          picked_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: EmptyRecord;
    Functions: EmptyRecord;
    Enums: EmptyRecord;
    CompositeTypes: EmptyRecord;
  };
};
