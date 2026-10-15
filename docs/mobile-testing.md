# Mobile testing: /MobDev

Open one demo screen full-screen on a real phone. Spec: [mobile-testing.spec.json](mobile-testing.spec.json) (issue #59).

## URLs

| URL | Shows |
| --- | --- |
| `/MobDev` | List of every screen type (links) |
| `/MobDev/<ScreenType>` | That screen, full-screen |
| `/MobDev/<ScreenType>?island=N&sens=X` | Same, with settings |

Screen types: `GameScene`, `QuestOriginal`, `QuestShoot`, `QuestDodge`, `QuestDoor`, `SignUp`, `LogIn`, `InfoRecovery`, `EditInfo`, `DialogBubble`. Any other name is a 404.

Settings (optional query):
- `island`: island for `GameScene` (default 1, clamped to a real island).
- `sens`: joystick sensitivity (default `SENSITIVITY_DEF`; not a number = default).

A quest's leave action (Elena's はい) goes back to `/MobDev`. No login needed; works on the Vercel deploy and on `http://<laptop-ip>:3000` over local Wi-Fi.

## Why a path segment, not `?screen=`
- `generateStaticParams` + `dynamicParams = false` prerender one static page per screen; other names 404 before any JS runs.
- Each screen is its own `next/dynamic` import in `screenHost.tsx`, so a phone downloads only the opened screen's chunk (checked on a prod build: QuestDoor / QuestShoot / LogIn each fetch a different chunk; LogIn loads no game code).
- The list uses `<Link prefetch={false}>` so opening it doesn't prefetch all 10 screens.

## Adding a screen
1. Add the name to `SCREEN_TYPES` in `src/app/MobDev/screenTypes.ts`.
2. Add its `dynamic(() => import(...), { ssr: false })` entry to `SCREENS` in `src/app/MobDev/[screen]/screenHost.tsx` (TypeScript errors until both match).
3. To show it in MobileTester too, add it to `PAGES` in `src/app/MobileTester/page.tsx`.

## Related
- `/MobileTester`: desktop viewer with a phone-size frame (unchanged).
- Replaced: `/Dev/QuestOriginal|QuestDodge|QuestShoot|QuestDoor` and `/Dev?Island=N`.
