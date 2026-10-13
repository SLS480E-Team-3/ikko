# 2026-10-12: entity size, tatami centering, Left or Right spec

## Done
- Entities 2x: `ENT_W` / `ENT_H` = 12 x 20 base * 2; eyes scale off the base height. MobileTester uses `ENT_W` instead of a hard-coded 12.
- `BgSection.tileX` shifts a tile pattern sideways; the dojo floor uses it to center the tatami.
- Committed on main as `3eab123` (local, not pushed), including the user's `ZOOM_DEF` 1 -> 1.5.
- Issue #54 rewritten as "Quest: Left or Right" (the old corridor / spike-wall idea kept in a details block).
- Switched to branch `Issue54` (tracks origin/Issue54) and fast-forwarded it to main (`3eab123`); Issue54 was already contained in main.
- /grill-me spec for the quest: `docs/left-or-right.spec.json` (status clear).

## Decisions
- See the spec's `decisions` (D-1..D-16): 14-verb pool, 10 correct answers, 3 HP, far decoys Q1-5 / close decoys Q6-10, random door side, Ryuuko voiced but off screen, lines shown on the sign, walk into a door, no timer.
- Feature specs live in `docs/`, not at the repo root.

## Built
- Built the Left or Right quest (MobileTester tab `quest door` only): `verbs.ts` (14 verbs, `buildRun`), `Scene/leftRightTraining.ts` (hook, sign, doors), `Scene/leftRightQuestIsland.tsx` (shell, HP bar), `leftRightNpcs` in `npcs.ts`; new `lr-*` dialog conditions (dialogBubble.tsx, toNPCProps.ts, dialog.py); ryuuko.json / elena.json entries; `python/dialogs/ryuuko_verbs.yaml`; 18 new mp3s in `public/dialog/ryuuko/`. `DOJO_TOP / SIDE / BOTTOM` exported from gameScene.tsx.
- Doors narrowed to 80 px with a 48 px gap so both fit on a phone screen at zoom 1.5.

- Hallway redesign (D-17): `hallSections` / `hallBg` (plank floor, dojo walls, solid door post) in gameScene.tsx; leftRightTraining.ts lays out a 284 px wide, 3-screen-tall hall (doors wall to wall, sign above them, end room past them), doors block through `wallY`, wrong door bounces 48 px, correct sends back to spawn, 10th correct opens the doors; `leftRightNpcs` puts Ryuuko in front of the spawn at the start, past the doors after a clear, behind the player on fail. Docs: scenes/hallway.md.
- Corridor shortened: the hall is a fixed 784 px tall (`hallH()`), 240 px from the spawn to the doors, so the doors are on screen from the start.
- Partition wall behind the doors (solid, like the far wall) + black-screen transition on a correct door (`fadeTo` / `getFade`); the 10th correct moves the player into the end room below Ryuuko and opens her talk; doors never open (D-18).
- Shrunk to one room (552 px tall, `CORRIDOR` 200), doors at the foot of the back wall; partition and end room removed; after the 10th correct the player comes back out at the spawn with Ryuuko and Elena in front (D-19).
- Doors moved 40 px up into the back wall (cover the panel band, touch the plaster); sign shrunk to 56 px to fit on the plaster above them.
- Splitter (door post) removed, doors 92 px wide and touching; doors moved fully into the back wall; sign moved to a fixed HUD box at the top of the screen; wallY dropped (the solid wall stops the player, the hit box reaches 6 px below the doors); fixed a 2 px border offset in the door / floor positions (D-20).
- Feet-only hit box in the door room: GameScene `feetH` prop (move checks use the bottom feetH px; unset elsewhere), the quest passes FEET_H 8 and tests the door touch with the feet.

## Verified
- `npx tsc --noEmit` passes; `buildRun` checked over 2000 runs (10 unique verbs, 買う / 待つ in Q1-5, partner decoys in Q6-10, sides ~50/50).
- The tab renders the dojo, both doors and Ryuuko; all 21 clips the quest plays return 200.
- Not verified: playing a full run in the browser pane (it runs at ~2 fps, so walking is too slow to drive).

## Next steps
- Play the `quest door` tab by hand on a phone: intro → run → wrong door / fail → retry → 10 correct → Elena.
- Later: quest type column + SQL + QuestScene routing to put it on the real quest page.
- Nothing from this session is committed on Issue54 yet.
