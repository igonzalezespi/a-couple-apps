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
create policy "profiles readable by authenticated users"
  on shared.profiles for select
  to authenticated
  using (true);

-- ...but can only insert/update/delete their own.
create policy "users manage their own profile"
  on shared.profiles for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Realtime: broadcast row changes so both users stay in sync.
alter publication supabase_realtime add table shared.profiles;
