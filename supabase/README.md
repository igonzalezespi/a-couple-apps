# Supabase

One project (free tier). Cross-app data lives in the `shared` Postgres schema;
each app adds its own schema (`movies`, `plans`) in its own change. `@aca/core`
is the only code that talks to Supabase.

## Setup (per environment)

1. `supabase init` to scaffold `config.toml`, then expose the custom schema in the API:
   `[api] schemas = ["public", "graphql_public", "shared", "movies"]`.
2. `supabase db push` (or `supabase migration up`) to apply `migrations/`.
3. Regenerate types and point `@aca/core`'s `Database` at them (currently a placeholder):
   `supabase gen types typescript --schema public --schema shared --schema movies > packages/core/src/database.types.ts`

Secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) go in `.env` — see `.env.example`.

## migrations/

- `0001_shared_schema.sql` — the `shared` schema only (no tables yet; there is no auth, so no `profiles`).
- `0002_movies_schema.sql` — `movies` schema + `watchlist_items` (couple-shared, `watched` flag, `added_by` person id) + RLS + `anon` grants + realtime publication.
