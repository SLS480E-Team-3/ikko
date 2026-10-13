# 2026-10-12: quest tutorials (Hiroko), dev routes, small fixes

## Done
- `/Dev/QuestDoor` (full-screen door quest) and `/Dev?Island=N` (MobileTester's island preview, moved to `Scene/islandPreview.tsx`).
- Pinch zoom works mid-level in the shoot quest: a second finger within `PINCH_GAP_MS` (150) of the first is a pinch, a later one shoots.
- Door quest: いいね！ / 違うわよ！ no longer cut off; the next word waits for the line (`lineMs` in voice.ts).
- Issue #57: /grill-me spec `docs/quest-tutorials.spec.json` (clear), then built it on branch `Issue57`.

## Built (quest tutorials)
- Hiroko (`npcs/dialogs/hiroko_en.json`, voice `hiroko_en`, an English copy of `hiroko`; 19 mp3s in `public/dialog/hiroko_en/`).
- `Scene/tutorial.ts`: `useTutorial`, `useMergedTalk`; wired into all four quest islands (agent).
- New conditions `tut-ask`, `tut-bye`, `tut-<quest>-<touch|keys>`; dialog lines may have `en` without `kana` (English-only page in DialogBubble).
- Supabase: `user_tutorials` table + `POST /api/Tutorial` + the quest page reads the flag for `'original'` (agent).
- Docs: `docs/quest-tutorials.md`, `docs/dialogs-and-voice.md`, SQL in `docs/SQL-query.md`.

## Verified
- `npx tsc --noEmit` passes; hiroko_en.json passes `validate_npc`; all 20 mp3s return 200.
- Browser pane: original (phone width) auto question → はい → rules → "Drag anywhere to move. Pinch to zoom." → hand-off; dodge (desktop) shows the W A S D line; after her talk Ryuuko's はい starts the run and Hiroko is gone; door hall shows Hiroko inside the walls.
- Not verified: いいえ path in the browser, shoot island in the browser, the account path (needs the SQL).

## Next steps
- Run the `user_tutorials` SQL in Supabase, then open a real quest twice: asked the first time, not the second.
- Listen to Hiroko's lines; `_sample.mp3` is a Japanese sample line (voice.py's sample prompt is Japanese-only).
- Nothing committed on Issue57 yet.
