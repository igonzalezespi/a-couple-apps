type EmptyRecord = Record<string, never>;

/**
 * The cross-app Supabase database shape: only the schemas every app shares
 * (`public`, `shared`). Both carry no tables yet -- there is no auth (identity is a
 * local person choice, see couple.config, so no `profiles`). Per-app schemas
 * (`movies`, `plans`) are NOT defined here; each app composes its own database type
 * as `BaseDatabase & { <schema>: ... }` and passes it to the generic client/hook (see
 * `apps/movies/src/lib/database.ts`). Regenerate the per-app schema blocks from the
 * real project with `supabase gen types typescript` once they grow.
 */
export type BaseDatabase = {
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
};
