# Mobile testing manual

How to open any Ikko screen on your own phone. No login needed.
(How it's built: [mobile-testing.md](mobile-testing.md).)

## 1. Pick where to open it

| Option | When | URL on the phone |
| --- | --- | --- |
| **Vercel** (easiest) | Testing what's on `main` | `https://ikko.vercel.app/MobDev` |
| **Your laptop, same Wi-Fi** | Testing local changes before pushing | `http://<laptop-ip>:3000/MobDev` |

### Laptop over Wi-Fi

1. Connect the phone and laptop to the same Wi-Fi.
2. Find the laptop's IP:
   - macOS: `ipconfig getifaddr en0` (e.g. `192.168.1.23`)
   - Windows: `ipconfig` → "IPv4 Address"
3. Start the dev server **on that IP**. Next.js blocks other devices from `localhost`-only dev servers, so plain `npm run dev` loads a blank or broken page on the phone:
   ```bash
   npx next dev -H 192.168.1.23
   ```
4. On the phone, open `http://192.168.1.23:3000/MobDev`.

Notes:
- The laptop opens it at the same IP address (`localhost` isn't served in this mode).
- First load in dev is slow (it compiles the page). For real-speed testing, use Vercel, or `npm run build` then `npx next start -H <laptop-ip>`.
- Doesn't load? Check the laptop firewall allows port 3000, and that the phone isn't on mobile data or a guest network.

## 2. Pick a screen

`/MobDev` shows a list; tap one. Or type the URL directly:

| Screen | URL |
| --- | --- |
| Island (NPCs, row/island buttons) | `/MobDev/GameScene` |
| Original quest | `/MobDev/QuestOriginal` |
| Shooting quest | `/MobDev/QuestShoot` |
| Dodging quest | `/MobDev/QuestDodge` |
| Left or Right (door) quest | `/MobDev/QuestDoor` |
| Sign up | `/MobDev/SignUp` |
| Log in | `/MobDev/LogIn` |
| Info recovery | `/MobDev/InfoRecovery` |
| Edit info | `/MobDev/EditInfo` |
| Dialog bubble preview | `/MobDev/DialogBubble` |

Names are case-sensitive: `/MobDev/questdoor` is a 404.

## 3. Optional settings

Add to the end of the URL:

| Setting | Meaning | Example |
| --- | --- | --- |
| `island=N` | Which island `GameScene` opens on (default 1) | `/MobDev/GameScene?island=2` |
| `sens=X` | Joystick sensitivity (default is the game's normal value) | `/MobDev/QuestShoot?sens=1.5` |

Combine with `&`: `/MobDev/GameScene?island=2&sens=1.5`.

## 4. While testing

- **Sound:** phones block audio until you tap the screen once, so the first greeting can be silent.
- **Leaving a quest:** Elena's はい at the end takes you back to the `/MobDev` list.
- **Add to Home Screen** (Safari share menu / Chrome menu) on `/MobDev` gives a one-tap shortcut.
- **Progress isn't saved:** these screens run without an account, so tutorials ask every time and quests always start fresh.

## Desktop alternative

`/MobileTester` on a laptop shows a screen inside a phone-sized frame (20 device sizes). It's good for layout checks, but touch, sound and speed are only real on a phone.

## Reporting a problem

Write down the URL, the phone model and browser, what you did, and what went wrong (a screenshot helps).
