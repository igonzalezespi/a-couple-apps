-- Optional defense-in-depth: restrict who can create an account on this instance.
-- The real boundary is that each couple builds the app with their own (private) Supabase
-- URL + anon key, so the project is not reachable by outsiders. This is a backstop.
--
-- Fail-open by design: while `shared.allowed_emails` is empty, anyone can sign up (the
-- default behavior, so nothing breaks before you populate it). Once you add your emails,
-- only those addresses may create a new user. Existing users signing in are unaffected.
--
-- To activate (data lives in your private DB, never in source):
--   insert into shared.allowed_emails (email) values ('you@example.com'), ('partner@example.com');

create table if not exists shared.allowed_emails (
  email text primary key
);

-- Admin-only config: RLS on with no policies means only the service role (which bypasses
-- RLS) can read/write it; clients cannot. No grants to anon/authenticated either.
alter table shared.allowed_emails enable row level security;

create or replace function shared.enforce_email_allowlist()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  -- Fail open: no allowlist configured => allow anyone (preserves default sign-up).
  if (select count(*) from shared.allowed_emails) = 0 then
    return new;
  end if;
  if new.email is null
     or lower(new.email) not in (select lower(email) from shared.allowed_emails) then
    raise exception 'Email % is not allowed to sign up on this instance', new.email
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_email_allowlist on auth.users;
create trigger enforce_email_allowlist
  before insert on auth.users
  for each row execute function shared.enforce_email_allowlist();
