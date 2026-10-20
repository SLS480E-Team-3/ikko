# Island 2 NPCs → dodge quest (2026-10-19)

## Done
- `islandQuestType(islandId)` in `src/utils/islands.ts`: island 2 → `'dodge'`, others → `'original'`.
- `/Game/[island]/[quest]` reads the user_tutorials row for that type and passes `questType` to `QuestScene`.
- `QuestScene` renders `DodgeQuestIsland` for `'dodge'`, `QuestIsland` otherwise; Hiroko's onSeen saves the matching type.
- `/MobDev/GameScene` (islandPreview) makes the same pick, so island 2's NPCs open the dodge quest there too.

## Notes
- Not clicked through in the browser (synthetic key input couldn't walk the player to an NPC); `npx tsc --noEmit` passes.

## Next
- Try island 2 → NPC → はい on a phone, in /Game (logged in) and /MobDev/GameScene?island=2.
