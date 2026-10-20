# particleTraining

- **Path:** `src/components/Game/Scene/particleTraining.ts`
- **Topic:** island-3
- **Purpose:** Game logic of island 3's particle quest: a copy of `training.ts` where the right block is the particle that fills the current sentence's blank.

## Constants / types

- `PARTICLE_LEVELS: ParticleLevel[]`: level 1 `に / で`, 60 px/s every 1.4 s, 50% answer; level 2 adds `を / へ`, 100 px/s every 0.9 s, 40% answer.
- `WOOD_W` / `WOOD_H` (56 x 40): the wood piece's draw and hit size.
- `SUPPLIES`: emoji icons a right catch earns in turn.
- `ParticleHud`: `{ sign, en, answer, current, quota, hp, maxHP, secondsLeft, timeFrac, playing, hurtAt, supplies, supplyIcon, gotAt }`.
- Reuses `TrainingPhase`, `RYUUKO`, `ELENA`, `throwSpot`, `playSpot` from `training.ts` (read-only).

## Functions

### `useParticleTraining`

The quest's state machine and per-frame logic (phases intro / play1 / levelUp / break / play2 / success / fail / again; 60 s, 10 hp, quota 10 per level).

**Input**

| Name | Type | Meaning |
| --- | --- | --- |
| `w`, `h` | `number` | island size in world px |
| `onLeave` | `() => void` (optional) | Elena's はい: leave the quest |
| `kana` | `string` (default `'mix'`) | `'に'`, `'で'` or `'mix'`: the sentence pool |

**Output:** `{ phase, failedLevel, wallY, onTick, onChoice, onTalkEnd, renderWorld, getHud, playerLabel, talkRequest, moveRequest }`, same shape as `useTraining`.

**Side effects:** plays Ryuuko's clips (`dialogUrl('ryuuko', audioName(text))`): the full sentence on a right catch, the caught particle on a wrong one, plus the damage SFX; preloads those clips at each level start.

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleQuestIsland.tsx` | `Training` |

### `WoodBlock` (internal)

A flying wood piece: a brown plank (stripe-gradient grain, dark border) with the particle, center-anchored at `(x, y)`.

**Input:** `{ kana: string, x: number, y: number }`

**Output:** a React element (createElement).

**Side effects:** none

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleTraining.ts` | `renderWorld` |
