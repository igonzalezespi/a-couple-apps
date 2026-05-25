import { type Profile } from './contracts';

type EmptyRecord = Record<string, never>;

/**
 * Minimal placeholder of the Supabase database shape for the `shared` schema.
 * Regenerate from the real project with `supabase gen types typescript` once it
 * exists; per-app schemas (`movies`, `plans`) are added by their app changes.
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
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Pick<Profile, 'id' | 'display_name'> & Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
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
          added_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tmdb_id: number;
          title: string;
          poster_path?: string | null;
          release_date?: string | null;
          watched?: boolean;
          added_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tmdb_id?: number;
          title?: string;
          poster_path?: string | null;
          release_date?: string | null;
          watched?: boolean;
          added_by?: string;
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
