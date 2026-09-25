export type QuestsProps = {
    questId?: number,
    islandId?: number,
    title?: string,
    rewardPoints?: number,
}
// quest definition, same for every user -> one row in `quests`.
// questLogic removed: a column holds data, not functions. Clear checking
// runs server-side (Server Action keyed by questId) so answers never
// reach the browser

export type UserQuestProps = {
    userId?: string,
    questId?: number,
    startedAt?: string,
    updatedAt?: string,
    completedAt?: string | null,
}
// per-user progress -> one row in `user_quests`. completedAt null = not
// cleared; replaces completeFlag (derive with completedAt !== null) so a
// flag and timestamp can't disagree. Timestamps are ISO strings because
// supabase-js returns timestamptz as strings; userId is a string because
// Supabase auth.users ids are uuids

export const QUESTS_SQL = `
create table quests (
  id            bigint generated always as identity primary key,
  island_id     bigint not null references islands(id),
  title         text not null,
  reward_points int  not null default 0
);

create table user_quests (
  user_id      uuid   not null references auth.users(id) on delete cascade,
  quest_id     bigint not null references quests(id) on delete cascade,
  started_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, quest_id)
);
`
// snake_case columns (Postgres convention) map to the camelCase types
// above. Composite primary key = one progress row per user per quest.
// on delete cascade removes progress when the user or quest is deleted.
// Run in the Supabase SQL editor after the islands table exists
// (island_id references it)

// ===========================================================================
// ===========================================================================
//                                  QUEST
// ===========================================================================
// ===========================================================================

// Planning about 5,6 Islands
export type IslandProps = {
    islandId?: number,
    islandName?: string,
    islandThreshHold?: number,
    sortOrder?: number,

    quests?: QuestsProps[]
}
// island definition, same for every user -> one row in `islands`.
// quests is filled by joining `quests` on island_id, not stored here.
// Size and world objects (trees, rocks, quest NPC spots) are NOT in the
// db: they live in map files under public/gameAssets/ (e.g.
// public/gameAssets/islands/island1.json), matched to this row by
// islandId. Layout is the same for everyone and rarely changes, so files
// keep it versioned in git and editable without SQL; quest spots in the
// map reference questId instead of copying quest data

export type UserIslandProps = {
    userId?: string,
    islandId?: number,
    currentPoints?: number,
    unlockedAt?: string | null,
}
// per-user progress -> one row in `user_islands`. unlockedAt null =
// locked; replaces lockedFlag (derive with unlockedAt !== null), same
// nullable-timestamp pattern as completedAt. The server sets it once
// points reach the threshold, so the client can't unlock islands itself

export const ISLANDS_SQL = `
create table islands (
  id             bigint generated always as identity primary key,
  name           text not null,
  threshold      int  not null default 0,
  sort_order     int  not null unique
);

create table user_islands (
  user_id        uuid   not null references auth.users(id) on delete cascade,
  island_id      bigint not null references islands(id) on delete cascade,
  current_points int    not null default 0,
  unlocked_at    timestamptz,
  primary key (user_id, island_id)
);
`
// sort_order is unique so two islands can't claim the same slot in the
// island list. Composite primary key = one progress row per user per
// island. Run this BEFORE QUESTS_SQL, since quests.island_id references
// islands

// ===========================================================================
// ===========================================================================
//                                  ISLAND
// ===========================================================================
// ===========================================================================

export type UserProps = {
    id?: string,
    userName?: string,
    name?: string,
    color?: string,
    createdAt?: string,

    island?: UserIslandProps[],
}
// public profile -> one row in `profiles`. email and password are NOT
// here: Supabase Auth keeps them in auth.users (password only as a hash),
// and email is read from the session when needed. id is the auth.users
// uuid, so it's a string. island is the user's progress rows, filled by
// joining `user_islands` on user_id -- key name kept so playerRenderer's
// UserProps['island'] still resolves

export const USERS_SQL = `
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique,
  name       text,
  color      text,
  created_at timestamptz not null default now()
);
`
// profiles.id IS the auth user's id (1:1), so deleting the account in
// Supabase Auth cascades to the profile, and through auth.users to
// user_islands / user_quests. username is unique for login/display
// handles; name is an optional display name. Run order: USERS_SQL,
// ISLANDS_SQL, QUESTS_SQL

export const SIGNUP_TRIGGER_SQL = `
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`
// every new auth.users row (signup) inserts its matching profiles row in
// the same transaction, so an account never exists without a profile.
// username/name come from the signup call's metadata:
//   supabase.auth.signUp({ email, password,
//     options: { data: { username, name } } })
// If username is missing or already taken, the insert fails (not null /
// unique) and the whole signup is rolled back -- check availability
// before calling signUp for a friendly error. security definer runs the
// function as its owner, since the auth service inserting the user can't
// write to public.profiles itself; search_path = '' (with the
// fully-qualified public.profiles) blocks search_path hijacking, per the
// Supabase docs pattern. Run after USERS_SQL (profiles must exist)

// ===========================================================================
// ===========================================================================
//                                  USER
// ===========================================================================
// ===========================================================================