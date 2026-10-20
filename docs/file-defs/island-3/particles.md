# particles

- **Path:** `src/components/Game/particles.ts`
- **Topic:** island-3
- **Purpose:** The particle quest's sentence pools (12 に, 12 で), decoys and small helpers; the user edits the lists directly.

## Types

- `Particle` = `'に' | 'で'`
- `Sentence` = `{ before, after, answer: Particle, en }`: hiragana before / after the blank, the right particle, the English line.

## Constants

- `NI_SENTENCES`, `DE_SENTENCES`: `Sentence[]`, 12 each. Every sentence needs a matching line in `python/dialogs/ryuuko_particles.yaml`.
- `DECOYS`: `['を', 'へ']`, thrown only in level 2.

## Functions

### `sentencesFor`

The quest's sentence pool.

**Input**

| Name | Type | Meaning |
| --- | --- | --- |
| `kana` | `string` | `'に'`, `'で'`, or anything else (`'mix'`) |

**Output:** `Sentence[]`: `NI_SENTENCES`, `DE_SENTENCES`, or both concatenated.

**Side effects:** none

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleTraining.ts` | `useParticleTraining` (poolRef) |

### `targetFor`

Ryuuko's `{target}` for the quest line.

**Input**

| Name | Type | Meaning |
| --- | --- | --- |
| `kana` | `string` | the quest's kana prop |

**Output:** `string`: `'に'` / `'で'`, else `'にとで'`.

**Side effects:** none

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleQuestIsland.tsx` | `Training` (questIslandNpcs target) |

### `fullSentence`

`before + answer + after`: the text Ryuuko reads; its mp3 is `audioName()` of it.

**Input:** `s: Sentence`

**Output:** `string`

**Side effects:** none

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleTraining.ts` | `startLevel` (preload), `onTick` (right catch) |

### `signText`

`before + '＿' + after`: the sign's line.

**Input:** `s: Sentence`

**Output:** `string`

**Side effects:** none

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleTraining.ts` | `getHud` |

### `shuffle`

Fisher-Yates shuffle on a copy.

**Input:** `a: T[]`

**Output:** `T[]`: a new shuffled array.

**Side effects:** none

**Used in**

| Topic | File | Where |
| --- | --- | --- |
| island-3 | `src/components/Game/Scene/particleTraining.ts` | `nextSentence`, `startLevel`, queue init |
