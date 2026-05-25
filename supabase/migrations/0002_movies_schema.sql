-- Movies app schema: the couple's shared watchlist. One Supabase project per couple, built with
-- that couple's own anon key (the access boundary -- there is no per-user auth). Identity is the
-- locally-selected person from couple.config, so added_by is that person's id, not an auth user.

create schema if not exists movies;

create table if not exists movies.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  release_date text,
  watched boolean not null default false,
  -- The couple.config person id who added it (e.g. 'personA'); client-supplied, no auth.
  added_by text,
  created_at timestamptz not null default now()
);

-- A given TMDB movie appears once on the shared list.
create unique index if not exists watchlist_items_tmdb_id_key
  on movies.watchlist_items (tmdb_id);

alter table movies.watchlist_items enable row level security;

-- No auth: the app uses the anon key, so the anon role may read/write the shared list. The anon
-- key embedded in the couple's private (non-distributed) build is the access boundary.
drop policy if exists "watchlist readable" on movies.watchlist_items;
create policy "watchlist readable" on movies.watchlist_items
  for select to anon using (true);

drop policy if exists "watchlist insertable" on movies.watchlist_items;
create policy "watchlist insertable" on movies.watchlist_items
  for insert to anon with check (true);

-- The list is shared (either person marks watched / removes). UPDATE is column-scoped to
-- `watched` by the grant below, so a client cannot rewrite added_by after insert.
drop policy if exists "watchlist updatable" on movies.watchlist_items;
create policy "watchlist updatable" on movies.watchlist_items
  for update to anon using (true) with check (true);

drop policy if exists "watchlist deletable" on movies.watchlist_items;
create policy "watchlist deletable" on movies.watchlist_items
  for delete to anon using (true);

-- Custom schemas are not granted to the API roles by default. Grant the anon role what the app
-- needs; UPDATE is restricted to the `watched` column (added_by stays as written on insert).
grant usage on schema movies to anon;
grant select, insert, delete on movies.watchlist_items to anon;
grant update (watched) on movies.watchlist_items to anon;

-- Realtime: broadcast row changes so both people stay in sync. Guarded for idempotent re-apply.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'movies' and tablename = 'watchlist_items'
  ) then
    alter publication supabase_realtime add table movies.watchlist_items;
  end if;
end $$;
