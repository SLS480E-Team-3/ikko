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

## Roadmap for islands 3–5 (Issues #60–62), from ikko-vision.pdf
- Plan approved: 3 = particles に/で (forest, "catch the right wood"), 4 = は/が port town (talk-and-reply + listen-and-match), 5 = final boss (boss rush). One branch per issue, in order; grill-me at the start of each issue when unclear (saved to CLAUDE.local.md).

## Issue60 (island 3) — branch Issue60
- Spec: docs/island-3.spec.json; scene: docs/scenes/forest-island.md (forest / clearing / bank / river, 9 new sprites).
- Particle quest: particles.ts (24 drafted sentences — user will edit), particleTraining.ts, particleQuestIsland.tsx; type 'particle'; /MobDev/QuestParticle.
- NPCs hand out quests one at a time (npcsForParticles: Shuto に → Jordi で → Tiffany mix).
- Fixed: toNPCProps CONDITION regex needed `particle`, or every quest island threw at load.
- SQL for island 3 quest rows appended to docs/SQL-query.md (user runs it). Old kana quests stay on island 1 (= alphabet island in the vision), so no island_id fix was needed.
- Not verified: a full particle run (synthetic input can't play it); `npm run build` skipped while the dev server runs.
- Scene notes for the user: river edge covers much of the bank; bridge/fish are in the water; cabin reads blocky.
- Next: Issue61 (grill first).
