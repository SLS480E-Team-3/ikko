# Page Relations

- redirect by browser: **ex** onSubmit -> island page
- redirect by user: **ex** navigation arrow `<-` `->`

### Pages

- [SignUp](#sign-up): Sign up page
- [LogIn](#log-in): Log in page
- [EditInfo](#edit-info): Info editing page
- [InfoRecovery](#info-recovery): Recover info page
- [IslandScene](#islands)
- [QuestScene](#quests)

IslandScene is rendered by `/Game/[island]`, QuestScene by `/Game/[island]/[quest]`.
The pages (server) do the checks and Supabase work, then pass `IslandSceneProps` / `QuestSceneProps` to the scenes (client), which only render.

# on Action

- `/` logged out -> LogIn (proxy)
- `/` logged in -> island=profiles.last_island_id/IslandScene
- LogIn / SignUp while logged in -> `/` -> island=profiles.last_island_id/IslandScene (proxy)
- `/Game/...` logged out -> LogIn (proxy)
- locked island -> island=profiles.last_island_id/IslandScene (first island if that is the locked one)
- quest under the wrong island -> its real `/Game/[island]/[quest]`
- quest on a locked island -> `/Game/[island]` -> (locked island rule above)
- SignUp success -> island=first/IslandScene
- SignUp with email confirmation -> stays, "check your email"; email link -> `/api/SignUp` GET -> island=first/IslandScene
- LogIn success -> island=profiles.last_island_id/IslandScene
- LogIn error -> stays, message under the button + "forgot" link to InfoRecovery
- quest COMPLETE -> island=current/IslandScene (points added, next island unlocked at its threshold)

# by User

- LogIn "sign up" link -> SignUp
- IslandScene quest link -> quest/QuestScene (start or resume)
- QuestScene `<-` -> island=current/IslandScene (pause)

# first time

SignUp

# second time

LogIn

## Sign Up

**SignUp** -> island=first/IslandScene

## Log In

**LogIn** -> island=profiles.last_island_id/IslandScene

## Edit Info

## Info Recovery

## Islands

Opening an island saves it as `profiles.last_island_id`. The first island is always unlocked.

## Quests

### Start

**island=current/IslandScene** -> quest/QuestScene

First visit inserts the `user_quests` row (`started_at`).

### Pause

**quest/QuestScene** `<-` -> island=current/IslandScene

The quest shows `(resume)`.

### Resume

**island=current/IslandScene** -> quest/QuestScene

Bumps `updated_at` and keeps `started_at`.

### Complete

**quest/QuestScene** COMPLETE -> `/api/Quest` -> island=current/IslandScene

Sets `completed_at` once, adds `reward_points`, and unlocks the next island at its `threshold`. The quest shows `(done)`.






