# particleQuestIsland

- **Path:** `src/components/Game/Scene/particleQuestIsland.tsx`
- **Topic:** island-3
- **Purpose:** Shell of island 3's particle quest: a copy of `questIsland.tsx` with the sentence sign and a supply counter in the HUD.

## Functions

### `ParticleQuestIsland` (named export)

Measures its box once after mount (island = 2x screen wide, 1.5x tall), stops island BGM, and renders `Training`.

**Input**

| Name | Type | Meaning |
| --- | --- | --- |
| `onLeave` | `() => void` | leave the quest island |
| `kana` | `string` (optional) | `'に'`, `'で'` or `'mix'` (undefined = mix) |
| `sensitivity` | `number` (optional) | joystick sensitivity for GameScene |
| `tutorial` | `TutorialProps` (optional) | Hiroko's seen / onSeen |
| `children` | `ReactNode` (optional) | success slot (COMPLETE), shown in success / again |

**Output:** JSX

**Side effects:** `stopBgm()` on mount.

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| quests | `QuestScene.tsx` | to be wired by the main session |

### `Training` (internal)

`useParticleTraining` + `useTutorial('particle', ...)` + `questIslandNpcs(w, h, phase, targetFor(kana), failedLevel)`, rendered in `GameScene` with the `Hud`.

**Input:** `{ w, h, onLeave, kana?, sensitivity?, tutorial?, children? }`

**Output:** JSX

**Side effects:** none beyond the hooks'.

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleQuestIsland.tsx` | `ParticleQuestIsland` |

### `Hud` (internal)

Own rAF loop re-reading `getHud()`: damage flash, the sentence sign (top center: hiragana with ＿, English under it), the supply counter (top right: latest icon + count, pops on +1), timer strip (above the hp bar) and hp bar. Only while a level is played.

**Input:** `{ getHud: () => ParticleHud }`

**Output:** JSX or null

**Side effects:** requestAnimationFrame loop while mounted.

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleQuestIsland.tsx` | `Training` |

### `Bar` (internal)

Bordered track with a left-anchored fill (copied from `questIsland.tsx`).

**Input:** `{ frac: number, color: string, style: CSSProperties }`

**Output:** JSX

**Side effects:** none

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleQuestIsland.tsx` | `Hud` |
