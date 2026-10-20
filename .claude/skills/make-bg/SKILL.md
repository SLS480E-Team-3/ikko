---
name: make-bg
description: Make a repeating ground tile (sand, grass, lava rock) for a scene section. Use when the user says "make bg <material>", or from make-scene.
argument-hint: <material> [notes]
---
# Make a ground tile

**Not used by scenes now.** `/make-scene` gives each section one plain color (with merged borders) and scatters ground plants over it. Run this skill only when the user asks for a textured tile by name.

Arguments: `$ARGUMENTS`. The first word is the material (for example `sand`); it becomes the file name. Anything after it is notes (for example `wet, darker near the sea`).

Below, `{material}` is the material name.

## 1. Check
- If `public/img/bg/{material}.webp` exists, show it and stop, unless the user asked for a new one.
- The material is a ground surface seen from straight above. If it is an object (a rock, a bush), use `/make-sprite` instead.

## 2. Make the tile
From `python/`, with the venv active, run:

    python sprite.py tile {material} -c 4 --notes "<notes>"

- `-c 4` keeps the tile quiet (4 colors). Island 2 uses it.

- No reference image and no download: the tile comes from the text prompt alone.
- Tell the user the printed `generation id`. It is saved in `python/generations.json` with the prompt, so a similar design can be made later.
- Show the user `public/img/bg/{material}.webp` and the printed color.

## 3. Judge it
A good tile:
- Reads as {material} at a glance.
- Is quiet: sprites and the player stand out on top of it.
- Has no single feature that shows up as a grid when repeated.

The script already retries an empty answer 3 times. If the tile fails the list above, rerun once with `--force` and a note that fixes the problem (for example "less contrast, no stones"). After two tries, keep the flat color and say so.

## 4. Use it
- Called from make-scene: return the tile path and the color.
- Merged borders: a section that lies under another section gets `merge: true`. Its tile is then drawn up over its top border through `public/img/bg/merge.webp`. If that file is missing, run `python sprite.py merge` once (no Gemini call; one mask serves every soil pair).
- Called alone: tell the user the two values (`tile`, `color`) to put in a section of `ISLAND_SECTIONS` in `src/components/Game/Scene/gameScene.tsx`.
- Do not commit.
