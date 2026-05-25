type EmptyRecord = Record<string, never>;

/**
 * Minimal placeholder of the Supabase database shape. `public` and `shared` carry no tables
 * yet (there is no auth -- identity is a local person choice, see couple.config -- so no
 * `profiles`); per-app schemas (`movies`, `plans`) are added by their app changes. Regenerate
 * from the real project with `supabase gen types typescript` once it grows.
 */
export type Database = {
  public: {
    Tables: EmptyRecord;
    Views: EmptyRecord;
    Functions: EmptyRecord;
    Enums: EmptyRecord;
    CompositeTypes: EmptyRecord;
  };
  shared: {
    Tables: EmptyRecord;
    Views: EmptyRecord;
    Functions: EmptyRecord;
    Enums: EmptyRecord;
    CompositeTypes: EmptyRecord;
  };
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
