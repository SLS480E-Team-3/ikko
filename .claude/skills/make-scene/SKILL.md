---
name: make-scene
description: Plan and build a whole island scene - sections, object props, ground - then place it on an island. Use when the user says "make scene <scene>".
argument-hint: <scene> [island number] [notes]
---
# Make a scene

Arguments: `$ARGUMENTS`. The first word is the scene name (for example `tropical-island`). A number after it is the island id (1-5). The rest is notes.

Below, `{scene}` is the scene name and `{N}` the island id. If no island id is given, ask which island.

Facts to plan with:
- The world is 1400 x 2000 world px. The player spawns at the center (700, 1000). A phone shows about 390 px across.
- The players are absolute beginners in Japanese. Every prop is a word they learn from its sign.

## 1. Plan sections
- Split the world into 2-4 sections that fit {scene} (tropical-island: beach, forest, volcano).
- Each section is one rectangle `{x, y, w, h}`. Together they cover the whole world with no gap and no overlap.
- The spawn point is inside the easiest, most open section.
- Give each section one line: what it is and what the player does there.

## 2. Ask scene props
- For each section, list 2-4 props: single, physical objects a beginner would recognize at 32 px wide (palm-tree, coconut), not scenery (sky, sea).
- Per prop give: catalog key, Japanese in kana, romaji, English, blocking or walk-through, and how many are placed.
- Mark props already in `src/components/Game/Object/objects.ts` as "reuse".
- Keep the scene to 10 new props or fewer.
- Ask the user with AskUserQuestion, one multi-select question per section. Do not generate anything yet.

## 3. Ask ground
- The ground of a section is one plain color, with no texture. Do not call `/make-bg`. For each section, pick the color (sand `#f3e9c6`, moss `#a9cf7a`, volcano sand `#8f4a36`).
- For each section, also pick four ground plants: small walk-through decorations that fit the biome (beach: beach-grass, seashell, starfish, driftwood). They have no sign and are not words to learn.
- Mark plants already in `src/components/Game/Object/objects.ts` as "reuse".
- Ask the user with AskUserQuestion, one question per section.

## 4. Save the plan
- Write `docs/scenes/{scene}.md`: island id, a section table (name, rectangle, ground, color), a ground-plant table (section, four plants), and a prop table (key, kana, romaji, English, section, blocking, count, new or reuse).
- Show the tables in chat. This file is what the build follows.

## 5. Build
- For each new prop, in table order, run `/make-sprite <key> <notes>`. For a walk-through prop, leave `hitBox` out of its catalog entry.
- For each new ground plant, from `python/`, run `python sprite.py make <key>` with no `--ref` (no browser search, no download). Add its entry to `objects.ts` with no `hitBox`.
- If `public/img/bg/merge.webp` is missing, run `python sprite.py merge` once.
- If one fails, go on with the rest and list the failure at the end.

## 6. Place
- In `src/components/Game/islands/islands.ts`, add `ISLAND_{N}` built with `place(id, def, dx, dy, scale, interaction)`. `(dx, dy)` is the object's base, in world px from the spawn.
- Every placement stays inside its section. Nothing within 120 px of the spawn. Leave a walkable path at least 150 px wide between sections. Blocking objects do not touch each other.
- Each prop's first placement gets `{ kind: 'sign', text: '<kana> (<romaji>) = <English>' }`.
- Ground plants: spread `...scatter(prefix, defs, rect, count, seed)` into `ISLAND_{N}`, one call per section, with the rectangle 40 px inside the section. About 6 per section at the default scale 0.12, more for a tall section.
- Register the map in `ISLAND_MAPS` in `islands/index.ts`, and the sections in `ISLAND_SECTIONS` in `Scene/gameScene.tsx` (`color` only, no `tile`; `merge: true` on every section that lies under another, so its top border is a dithered line; `solid: true` on water, so the player stops at the shore).

## 7. Check
- Run `npx tsc --noEmit`.
- Open `/MobileTester` in the built-in browser at 1500 x 950, pick island {N}, and take a screenshot.
- Report: what was made, what was reused, what failed. Do not commit.
