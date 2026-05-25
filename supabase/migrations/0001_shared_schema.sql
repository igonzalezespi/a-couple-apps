-- Shared schema: cross-app data for the couple. Per-app schemas (movies, plans)
-- are added by their own app changes. Auth/realtime plumbing only here.

create schema if not exists shared;

create table if not exists shared.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table shared.profiles enable row level security;

-- Authenticated users can read profiles (the couple sees each other)...
drop policy if exists "profiles readable by authenticated users" on shared.profiles;
create policy "profiles readable by authenticated users"
  on shared.profiles for select
  to authenticated
  using (true);

-- ...but can only insert/update/delete their own. `(select auth.uid())` is evaluated
-- once per query (the Supabase RLS perf idiom), not once per scanned row.
drop policy if exists "users manage their own profile" on shared.profiles;
create policy "users manage their own profile"
  on shared.profiles for all
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- API access: the app always runs as `authenticated` (behind the auth gate), and the
-- RLS policies above do the row-level control. Custom schemas need explicit grants
-- (unlike `public`, which Supabase grants by default); `anon` is intentionally omitted.
grant usage on schema shared to authenticated;
grant select, insert, update, delete on shared.profiles to authenticated;

-- Realtime: broadcast row changes so both users stay in sync. Guarded so re-applying
-- the migration where the table is already published does not error (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'shared' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table shared.profiles;
  end if;
end $$;
