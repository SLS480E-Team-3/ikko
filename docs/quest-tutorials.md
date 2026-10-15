# Quest tutorials (Hiroko)

Spec: [quest-tutorials.spec.json](quest-tutorials.spec.json). Issue #57.

Every quest type has a tutorial, given in dialog only by **Hiroko**. She stands next to Ryuuko before the run (phase `intro`) and is gone during play and at the end.

## What the player sees

- **First time a quest type is opened:** Hiroko's talk opens by itself and asks "Want to learn how this quest works?"
  - **はい:** 3–5 English lines. They cover the rules, then the controls, then "Talk to Ryuuko when you are ready."
  - **いいえ:** only the hand-off line.
  - Either answer marks the quest type as seen.
- **Later visits:** there is no auto talk. In range she shows her question, and tapping her plays the tutorial.
- **Controls:** touch lines on a screen under 768 px wide, keys lines (W A S D, Space) on a wider one.

## Where it lives

| What | Where |
|---|---|
| Lines | `src/components/Game/npcs/dialogs/hiroko_en.json`: `tut-ask`, `tut-bye`, `tut-<original\|dodge\|shoot\|door>-<touch\|keys>` |
| Voice | `hiroko_en` in `python/voices.json`, an English copy of `hiroko`; mp3s in `public/dialog/hiroko_en/` |
| Logic | `src/components/Game/Scene/tutorial.ts`: `useTutorial(type, active, props)` and `useMergedTalk(...)` |
| Islands | `questIsland.tsx` (original), `dodgeQuestIsland.tsx`, `shootQuestIsland.tsx`, `leftRightQuestIsland.tsx` (door): optional `tutorial` prop |
| Seen flag | Supabase `user_tutorials (user_id, quest_type, seen_at)`, SQL in [SQL-query.md](SQL-query.md); written by `POST /api/Tutorial { type }`, read by the quest page |

## How it works

- **Hiroko's slot:** she is NPC index 1 (`HIROKO`) in `intro`, appended `HIROKO_DX` (56) world px right of Ryuuko. Elena is never out in `intro`, so index 1 is free.
- **Routing:** the island's `onChoice` / `onTalkEnd` first ask the tutorial (`tut.onChoice(n, c) || t.onChoice(n, c)`). A choice of hers never reaches the training, which would read npc 1 as Elena and leave.
- **One talk request:** GameScene takes one `talkRequest`, and `useMergedTalk` passes on whichever of the training's or Hiroko's request changed last.
- **States:**
  - `ask`: the question, as a `quest` talk with choices.
  - `teach`: the tutorial, as a `default` talk.
  - `bye`: the hand-off line, then back to `teach`.
- **No account** (`/MobDev/Quest*`, MobileTester): no `tutorial` prop, so she asks every time.
- **Account:** the real quest page (`/Game/[island]/[quest]`) only runs the original quest. It reads `user_tutorials` for `'original'`, and `QuestScene` posts to `/api/Tutorial` when the player answers.

## English lines

Hiroko's lines have no `kana`. The English sits in `en`, which wraps, because the big line is cut every 15 characters and would split words. A line with an empty `kana` becomes an English-only page in `DialogBubble`.
