# 2026-10-14: mobile-testing (issue #59, branch Issue59)

## Done
- Created issue #59 "mobile-testing" and branch `Issue59`.
- /grill-me spec `docs/mobile-testing.spec.json` (clear).
- Built `/MobDev` (link list) and `/MobDev/<ScreenType>` (SSG, `dynamicParams = false`, one `next/dynamic` chunk per screen in `screenHost.tsx`, `?island=` / `?sens=`).
- Moved `BubblePreview` out of MobileTester to `src/components/Game/Entity/bubblePreview.tsx`.
- Deleted `src/app/Dev/Quest*` (4 routes); `/Dev` is just the nav now; home-form quest buttons → `/MobDev/Quest*`, new MobDev button.
- Added `ikko-prod` (next start on :3001) to `.claude/launch.json` for checking prod chunking.
- Docs: `docs/mobile-testing.md`, file-defs in `docs/file-defs/mobile-testing/`, `/MobDev` line in `docs/page-relations.md`, `docs/quest-tutorials.md` route fix.

## Decisions
- Path segment over `?screen=` (static per-screen page + per-screen chunk). PascalCase names. Quest leave → `/MobDev`. No login, works on Vercel. MobileTester kept.

## Verified
- `npx tsc --noEmit` and `npm run build` pass; build lists 10 SSG paths under `/MobDev/[screen]`.
- Prod build in browser pane (375x812): list shows 10 links; QuestDoor / QuestShoot / LogIn / DialogBubble / GameScene each load their own chunk, LogIn no game code; `/MobDev/Foo` 404; `GameScene?island=2&sens=1.5` shows island 2; MobileTester dialog bubble still renders.
- Not verified in browser: quest leave action → `/MobDev` (needs playing a quest to the end); on a real phone.
- Gotcha: after deleting routes, stale `.next/dev/types/validator.ts` breaks tsc/build; `rm -rf .next/dev/types` fixes it.

## Next steps
- Try `/MobDev` on a real phone (Vercel preview or LAN IP).
- Nothing committed yet.
