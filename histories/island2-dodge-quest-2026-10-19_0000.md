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

## Island 3 → door quest
- `islandQuestType`: 3 → `'door'`. `QuestScene` and islandPreview render `LeftRightQuestIsland` for it (no `kana` prop: the door quest teaches verbs).
- Branch `island3-door-quest`; not clicked through in the browser either.

## Islands renumbered (1 → 5, 2 → 1, 3 → 2)
- Each scene moved whole: map (`ISLAND_N` renamed), `ISLAND_SECTIONS`, `ISLAND_BG` color, `ISLAND_BGM`, and `islandQuestType` (now 1 = dodge, 2 = door).
- Island 3 is empty now and took old island 5's pastel red. Object ids (tree-2-N, volcano-3-1) kept as-is; they only need to be unique.
- Scene docs' island ids updated. `island_2_quests.ts` (curriculum, unused in code) and the Supabase `quests.island_id` rows were not touched.
- Branch `island-renumber`.
