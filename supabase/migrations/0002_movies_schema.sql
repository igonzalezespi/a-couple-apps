-- Movies app schema: the couple's shared watchlist. One Supabase project per couple,
-- so "the couple" is every authenticated user of this instance (same model as the
-- shared.profiles policies in 0001).

create schema if not exists movies;

create table if not exists movies.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  release_date text,
  watched boolean not null default false,
  -- Who added it. Defaults to the caller; FK to auth.users (shared.profiles has no
  -- auto-create trigger, so referencing it would break inserts for users without a row).
  added_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- A given TMDB movie appears once on the shared list.
create unique index if not exists watchlist_items_tmdb_id_key
  on movies.watchlist_items (tmdb_id);

alter table movies.watchlist_items enable row level security;

-- Authenticated users (the couple) read the whole shared list...
drop policy if exists "watchlist readable by authenticated users" on movies.watchlist_items;
create policy "watchlist readable by authenticated users"
  on movies.watchlist_items for select
  to authenticated
  using (true);

-- ...add items only as themselves. `(select auth.uid())` is evaluated once per query
-- (the Supabase RLS perf idiom); added_by defaults to auth.uid() in the table.
drop policy if exists "watchlist insert as self" on movies.watchlist_items;
create policy "watchlist insert as self"
  on movies.watchlist_items for insert
  to authenticated
  with check ((select auth.uid()) = added_by);

-- ...edit any item (the list is shared, e.g. either partner marks watched). The column
-- grant below, not this policy, is what stops a client from rewriting added_by.
drop policy if exists "watchlist update by authenticated users" on movies.watchlist_items;
create policy "watchlist update by authenticated users"
  on movies.watchlist_items for update
  to authenticated
  using (true)
  with check (true);

-- ...and remove any item.
drop policy if exists "watchlist delete by authenticated users" on movies.watchlist_items;
create policy "watchlist delete by authenticated users"
  on movies.watchlist_items for delete
  to authenticated
  using (true);

-- API access: the app always runs as `authenticated` (behind the auth gate); the RLS
-- policies above do the row-level control. Custom schemas need explicit grants (unlike
-- `public`); `anon` is intentionally omitted - nothing is queried before sign-in.
-- UPDATE is granted only on `watched`: either partner can toggle it, but no client can
-- overwrite added_by (or any other column) via PATCH - the insert policy owns attribution.
grant usage on schema movies to authenticated;
grant select, insert, delete on movies.watchlist_items to authenticated;
grant update (watched) on movies.watchlist_items to authenticated;

-- Realtime: broadcast row changes so both users stay in sync. Guarded for idempotent re-apply.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'movies' and tablename = 'watchlist_items'
  ) then
    alter publication supabase_realtime add table movies.watchlist_items;
  end if;
end $$;
