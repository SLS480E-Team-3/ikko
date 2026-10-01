# Objects and Background

How the island scenes draw their ground, borders, waves and objects, and which functions do it.

- All sizes and positions are in **world px**. The world is `BG_W` 1400 x `BG_H` 2000. The player spawns at the center (700, 1000).
- One art pixel is 4 world px (sprites and tiles are drawn 4x, pixelated).
- Built scenes: [scenes/tropical-island.md](scenes/tropical-island.md) (island 2), [scenes/volcano.md](scenes/volcano.md) (island 3), [scenes/shrine.md](scenes/shrine.md) (Quest Island).
- The Quest Island is not 1400 x 2000. Its size is measured from the screen, so its sections are computed by `shrineSections(w, h)` and not listed in `ISLAND_SECTIONS`.
- Making the images: [python/README.md](../python/README.md) (`sprite.py make`, `tile`, `merge`).

## Files

| File | What is in it |
|---|---|
| `src/components/Game/Object/gameObject.ts` | Object types, `applyScale` |
| `src/components/Game/Object/objects.ts` | `OBJECTS`, the catalog of object kinds |
| `src/components/Game/Object/ObjectRenderer.tsx` | Draws one placed object |
| `src/components/Game/islands/islands.ts` | `place`, `scatter`, the maps `ISLAND_1`, `ISLAND_2`, `ISLAND_3` |
| `src/components/Game/islands/index.ts` | `ISLAND_MAPS`, map by island id |
| `src/components/Game/Scene/gameScene.tsx` | Background types, sections, borders, waves, blocking, the frame tick |

## Objects

### Types (`gameObject.ts`)

| Type | Fields | Meaning |
|---|---|---|
| `SpriteProps` | `w, h, src, alt` | The image and its drawn size |
| `HitBox` | `x, y, w, h` | The blocking box, measured from the sprite's top-left |
| `ObjectDef` | `sprite, hitBox?` | One kind of object. No `hitBox` = the player walks through it |
| `Interaction` | `{ kind: 'sign', text }` | A sign text shown when the player is near |
| `PlacedObject` | `id, def, x, y, interaction?, scale?` | One object on a map. `def` is a key of `OBJECTS`; `x, y` is the sprite's top-left |

### Functions

| Function | File | What it does |
|---|---|---|
| `applyScale(def, scale = 1)` | `gameObject.ts` | Returns the def with its sprite and hitBox multiplied by `scale`. The renderer, the depth order, the blocking and the sign range all use this scaled copy |
| `place(id, def, dx, dy, scale = 1, interaction?)` | `islands.ts` | Places an object by where its base stands. `(dx, dy)` is the bottom-center of the sprite, from the world center (`-x` = left, `-y` = up) |
| `scatter(prefix, defs, rect, count, seed, scale = 0.12)` | `islands.ts` | Spreads `count` walk-through decorations over a rectangle. The positions come from a seeded generator, so the layout is the same on every load. Nothing lands within `SPAWN_CLEAR` (120) of the spawn |
| `objectHitBoxes(objects)` | `gameScene.tsx` | The world-px hitBoxes of a map's objects. Used by callers that must keep clear of them (MobileTester's NPC spots) |

### Adding an object

1. Make the sprite: `/make-sprite <name>` (or `python sprite.py make <name>`).
2. Add the printed entry to `OBJECTS` in `objects.ts`.
3. Add a `place(...)` line to the island's map in `islands.ts`.
4. A new island's map is also registered in `ISLAND_MAPS` in `islands/index.ts`.

### How objects are drawn

- **Depth order:** each object's `zIndex` is its bottom edge (`y + sprite.h`). The player and the NPCs use the same rule, so whatever stands lower on the screen is drawn in front.
- **Fade:** an object turns 40% opaque while the player stands behind it (the player's feet are above the object's base and the player overlaps its sprite box). `ObjectRenderer`'s `faded` prop, set by `GameScene`.
- **Signs:** the text of a sign shows while the player is within `SIGN_RANGE` (16) of the object's hitBox. For an object with no hitBox, the sprite box is used.

## Background

### Types (`gameScene.tsx`)

`BGProps`: the whole world.

| Field | Meaning |
|---|---|
| `x, y` | Center of the world |
| `w, h` | Size of the world |
| `color` | The flat ground color |
| `img?` | An overlay image that does not affect entities |
| `sections?` | Ground areas drawn over `color`, under every object and entity |
| `border?` | A black square edge around the world, `BUBBLE_BORDER_W` (2) wide (Quest Island). Sections are placed from inside this edge |

`BgSection`: one rectangle of ground.

| Field | Meaning |
|---|---|
| `id` | Name of the section |
| `x, y, w, h` | The rectangle. `x, y` is its **top-left** corner |
| `color` | Fills the rectangle |
| `tile?` | A repeating image drawn over the color (`sprite.py tile`, in `public/img/bg/`) |
| `merge?` | The section reaches up over its top border in an uneven strip. See [Merged borders](#merged-borders) |
| `solid?` | The player can't walk onto the section. See [Blocking](#blocking) |
| `wave?` | The section moves up and down. See [Waves](#waves) |

### Data and functions

| Name | What it is |
|---|---|
| `ISLAND_BG` | Flat ground color per island id |
| `ISLAND_SECTIONS` | Ground sections per island id. An island with no entry keeps its flat color |
| `islandBg(islandId)` | The `BGProps` of one island: the shared world size, its color and its sections |
| `questBg(w, h)` | The `BGProps` of a quest scene: the measured size, sand ground, the shrine's sections and the black edge |
| `shrineSections(w, h)` | The Quest Island's sections: four red-roofed walls (solid) around a sand yard. See [scenes/shrine.md](scenes/shrine.md) |
| `ISLAND_COUNT` | 5 |

### Draw order, bottom to top

1. World color.
2. Sections.
3. Merge strips.
4. Objects, footprints, player and NPCs (by bottom edge).
5. Sign and dialog bubbles.

## Borders

There are two kinds: the border the player **sees** between two grounds, and the border the player **can't cross**.

### Merged borders

A section with `merge: true` draws its color (or tile) again in a strip above its top edge. The strip is cut by a mask, so the edge between the two grounds is a wavy, dithered line and not a straight one.

- **Mask:** `MERGE_MASK` (`/img/bg/merge.webp`), made by `python sprite.py merge`. It is full at the bottom and breaks into loose pixels toward the top. One mask works for every pair of grounds.
- **Strip:** `MERGE_H` (160) tall, placed at `sec.y - MERGE_H`.
- **Seam:** the section itself starts `MERGE_SEAM` (4) above its top edge, under the strip. Without this overlap, sub-pixel rounding leaves a thin line of the world color between the strip and the section when the world is zoomed.
- **Variation:** each next merged border moves the mask left by `MERGE_SHIFT` (388), so two borders do not show the same line.
- **Limit:** full-width top borders only. The section needs another section above it.

### Blocking

`overlaps(cx, cy, w, h, box, pad = 0)` is the one test for all blocking. The entity is center-anchored; the box is a top-left world box; `pad` grows the box (used for the sign range).

The scene keeps one list of blocking boxes (`solidsRef`):

| Source | Box |
|---|---|
| Objects | The object's `hitBox`, scaled and moved to its place |
| NPCs | The NPC's body |
| `solid` sections | The section's rectangle. With `merge`, the box starts `SHORE_IN` (85) above the section's top, so the player stops at the water's edge and not on the full color |

Each frame the tick tries the x step and the y step on their own. A step is dropped when it would put the player into a box the player is not already inside. So the player slides along a wall, and a player who is somehow inside a box can still walk out.

Other limits:

- **World edge:** the player's center is clamped so the body stays inside the world.
- **`wallY`:** a prop of `GameScene`. The player can't go above this y.

## Waves

A section with `wave: true` rises and falls. Island 2's ocean uses it.

### Motion

`waveOffset(now)` gives the section's y offset at the frame time `now` (ms).

- 0 at rest, down to `-WAVE_RISE` at the top of the wave, and back, once every `WAVE_PERIOD` seconds.
- The curve is `(1 - cos) / 2`: slow at both ends, like water that stops before it turns.
- The result is rounded to `WAVE_STEP`, so the shore moves on the pixel grid.
- The rest position is the lowest point. The water only comes up over the sand; it never uncovers the ground below.

### What moves

| Part | Change |
|---|---|
| Section div | `top` moves by the offset, `height` grows by the same amount, so the bottom stays at the world's edge |
| Merge strip | `top` moves by the offset. The shore line moves with the water |
| Blocking box | Kept apart from `solidsRef` in `waveBoxesRef` (rest position). Each frame it is moved by the offset and joins the blocking boxes for that frame |

### Push

After the player's step, the tick checks the moved wave boxes. If the player overlaps one, the player's y is set so the body sits just above the box (`b.y - ent.h / 2`, not above the world's top). So a player standing at the shore is carried up as the water rises, and is left there when it falls back.

## Tuning

All in `gameScene.tsx`, unless noted.

| Constant | Value | Change it to |
|---|---|---|
| `WAVE_RISE` | 40 | Make the wave reach further up the sand |
| `WAVE_PERIOD` | 4 | Make the wave slower (larger) or faster (smaller), in seconds |
| `WAVE_STEP` | 4 | Keep at 4 (one art pixel). 1 gives smooth motion |
| `SHORE_IN` | 85 | Stop the player higher (larger) or lower (smaller) on the shore |
| `MERGE_H` | 160 | Must match the mask's height printed by `sprite.py merge` |
| `MERGE_SEAM` | 4 | How far a merged section reaches up under its own strip, so no gap shows at the join. Keep at 4 (one art pixel) |
| `MERGE_SHIFT` | 388 | How different two borders look. Keep it a multiple of 4 |
| `SECTION_TILE_PX` | 256 | World px one ground tile covers |
| `SIGN_RANGE` | 16 | How near the player must be for a sign to show |
| `SPAWN_CLEAR` (`islands.ts`) | 120 | Empty radius around the spawn for `scatter` |
