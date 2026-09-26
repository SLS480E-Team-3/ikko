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

export const QUESTS_RLS_SQL = `
alter table quests      enable row level security;
alter table user_quests enable row level security;

create policy "quests readable by signed-in users"
  on quests for select
  to authenticated
  using (true);

create policy "users read own quest progress"
  on user_quests for select
  to authenticated
  using ((select auth.uid()) = user_id);
`
// RLS on = every row is denied unless a policy allows it. quests is shared
// content, so any signed-in user can read it; user_quests rows only match
// their owner. No insert/update/delete policies on purpose: the browser
// can't start or clear quests itself. The Server Action checks the answer,
// then writes with a service-role client (SUPABASE_SECRET_KEY,
// server-only, never NEXT_PUBLIC_), which bypasses RLS. auth.uid() is
// wrapped in (select ...) so Postgres runs it once per query, not per row
// (Supabase perf advice). Run after QUESTS_SQL

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
// db: they live in map files under src/components/Game/islands/ (e.g.
// island_1.ts, a PlacedObject[] resolved against the catalog in
// Object/objects.ts), matched to this row by islandId via ISLAND_MAPS. Layout is the same for everyone and rarely changes, so files
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

export const ISLANDS_RLS_SQL = `
alter table islands      enable row level security;
alter table user_islands enable row level security;

create policy "islands readable by signed-in users"
  on islands for select
  to authenticated
  using (true);

create policy "users read own island progress"
  on user_islands for select
  to authenticated
  using ((select auth.uid()) = user_id);
`
// same shape as QUESTS_RLS_SQL: shared islands are readable by everyone
// signed in, progress rows only by their owner, and with no write policies
// current_points / unlocked_at can only change through the server's
// service-role client -- a player can't give themselves points or unlock
// an island from devtools. Run after ISLANDS_SQL

export const FIRST_ISLAND_SEED_SQL = `
insert into islands (name, threshold, sort_order)
values ('Hajime Island', 0, 1)
on conflict (sort_order) do nothing;

insert into quests (island_id, title, reward_points)
select i.id, q.title, q.reward_points
from islands i
cross join (values
  ('Hiragana: a i u e o', 10),
  ('Greetings: konnichiwa', 10)
) as q(title, reward_points)
where i.sort_order = 1
  and not exists (select 1 from quests where quests.island_id = i.id and quests.title = q.title);
`
// starter data, not schema: the island every player begins on (lowest
// sort_order, threshold 0 = open from the start) plus two placeholder
// quests so the island page has links to tap. id is left to the identity
// column, and quests find the island by sort_order instead of assuming
// id 1. Safe to re-run: the unique sort_order and the not-exists check
// skip rows already there. Accounts made before this runs get the island
// unlocked on their next visit (/Game/[island] upserts the first island).
// Run after ISLANDS_SQL, ISLANDS_RLS_SQL and QUESTS_SQL

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
  username   text not null unique check (btrim(username) <> '' and position('@' in username) = 0),
  name       text not null check (btrim(name) <> ''),
  color      text,
  created_at timestamptz not null default now()
);
`
// profiles.id IS the auth user's id (1:1), so deleting the account in
// Supabase Auth cascades to the profile, and through auth.users to
// user_islands / user_quests. username is unique for login/display
// handles; name is the display name. Both are mandatory at signup (with
// email + password, which Supabase Auth itself requires): not null blocks
// a missing value, check (btrim(...) <> '') blocks '' or all-spaces, which
// not null alone lets through. color stays optional. Run order: USERS_SQL,
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
  insert into public.user_islands (user_id, island_id, unlocked_at)
  select new.id, id, now() from public.islands
  order by sort_order limit 1;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
` // trigger: **profile only** -> **profile + first island unlocked**, reason: a new player must be able to open island 1, mechanism: the same insert also writes a user_islands row for the lowest sort_order island with unlocked_at now(); re-run as `create or replace function` (drop the `create trigger` part) on an existing project
// every new auth.users row (signup) inserts its matching profiles row in
// the same transaction, so an account never exists without a profile.
// username/name come from the signup call's metadata:
//   supabase.auth.signUp({ email, password,
//     options: { data: { username, name } } })
// If username or name is missing/blank, or username is already taken, the
// insert fails (not null / check / unique) and the whole signup is rolled
// back, so no auth user is left without a profile -- validate the form
// fields and check username availability
// before calling signUp for a friendly error. security definer runs the
// function as its owner, since the auth service inserting the user can't
// write to public.profiles itself; search_path = '' (with the
// fully-qualified public.profiles) blocks search_path hijacking, per the
// Supabase docs pattern. Run after USERS_SQL (profiles must exist)

export const PROFILE_LAST_ISLAND_SQL = `
alter table profiles
  add column last_island_id bigint references islands(id) on delete set null;
`
// the island the player last opened: /Game/[island] writes it on every
// visit, and LogIn / the landing page send the player back there. null
// (new account, or that island was deleted) falls back to the first island
// by sort_order. The user edits it through the existing "users update own
// profile" policy, so no new RLS is needed. Run after USERS_SQL and
// ISLANDS_SQL

export const USERS_RLS_SQL = `
alter table profiles enable row level security;

create policy "profiles readable by signed-in users"
  on profiles for select
  to authenticated
  using (true);

create policy "users update own profile"
  on profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
`
// profiles only hold public info (username, name, color -- no email), so
// every signed-in user can read them, e.g. to draw other players' names.
// Users may edit only their own row: using picks which rows they can
// target, with check stops them rewriting id to someone else's. No insert
// policy: SIGNUP_TRIGGER_SQL creates the row, and its security definer
// function runs as the table owner, which RLS doesn't apply to. No delete
// policy: deleting the auth user cascades. Run after USERS_SQL

export const LOGIN_LOOKUP_SQL = `
create function public.email_for_username(p_username text)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = p_username;
$$;

revoke execute on function public.email_for_username(text) from public, anon, authenticated;
grant  execute on function public.email_for_username(text) to service_role;
`
// Supabase Auth only signs in with email (or phone) + password, so
// username login = look up that user's email, then do a normal email login.
// Login flow (future Server Action, one input field + password):
//   1. input contains '@' -> it's an email, use it as-is
//      (usernames can't contain '@', see the check in USERS_SQL)
//   2. otherwise -> service-role client:
//        rpc('email_for_username', { p_username: input })
//   3. server client from @supabase/ssr (anon key + cookies):
//        auth.signInWithPassword({ email, password }) -- sets the session
//   4. unknown username and wrong password return the SAME error message,
//      so the form can't be used to test which usernames exist
// The function reads auth.users, which the API can't reach, so it's
// security definer (runs as its owner). Because it maps a username to an
// email, execute is revoked from anon/authenticated -- Supabase grants
// them execute on public functions by default, so revoking from public
// alone isn't enough -- and granted only to service_role. The email is
// only ever read on the server and never sent to the browser.
// Run after USERS_SQL

// ===========================================================================
// ===========================================================================
//                                  USER
// ===========================================================================
// ===========================================================================