-- Tonight's pick: a single shared pick over the watchlist. Either person nominates one unwatched
-- movie; it floats to the top for both (realtime) and auto-clears when that movie is marked
-- watched or removed. picked_by is a couple.config person id (like added_by); no auth.

alter table movies.watchlist_items
  add column if not exists picked_at timestamptz,
  add column if not exists picked_by text;

-- A pick is all-or-nothing: both columns set together, or both null.
alter table movies.watchlist_items
  drop constraint if exists watchlist_items_pick_chk;
alter table movies.watchlist_items
  add constraint watchlist_items_pick_chk
  check ((picked_at is null) = (picked_by is null));

-- Clear this row's pick whenever it is (or becomes) watched -- the pick is for an unwatched movie.
-- BEFORE so it mutates the row in place (no recursive write). Runs on every update; the guard
-- makes it a no-op unless watched is true.
create or replace function movies.clear_pick_when_watched()
returns trigger
language plpgsql
as $$
begin
  if new.watched then
    new.picked_at := null;
    new.picked_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_clear_pick_when_watched on movies.watchlist_items;
create trigger trg_clear_pick_when_watched
  before update on movies.watchlist_items
  for each row execute function movies.clear_pick_when_watched();

-- Enforce a single shared pick: when one row becomes the pick, clear every other row's pick
-- (last pick wins). AFTER, scoped to updates that target picked_at, so it does not fire on a
-- plain mark-watched. The cascade nulls other rows' picked_at, which re-fires this trigger for
-- them with new.picked_at null -> the guard skips, so recursion is bounded to one level.
create or replace function movies.clear_other_picks()
returns trigger
language plpgsql
security definer
set search_path = movies, pg_temp
as $$
begin
  if new.picked_at is not null then
    update movies.watchlist_items
      set picked_at = null, picked_by = null
      where id <> new.id and picked_at is not null;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_clear_other_picks on movies.watchlist_items;
create trigger trg_clear_other_picks
  after update of picked_at on movies.watchlist_items
  for each row execute function movies.clear_other_picks();

-- Either person may set or clear the pick. Column-scoped UPDATE grant (like `watched`), so the
-- pick columns are writable but added_by still cannot be rewritten.
grant update (picked_at, picked_by) on movies.watchlist_items to anon;
