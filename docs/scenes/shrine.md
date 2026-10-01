# Scene: shrine

- **Island:** the Quest Island (no island id). Used by all three quest scenes: original, dodge, shoot.
- **Made by:** code only, `shrineSections(w, h)` in `src/components/Game/Scene/gameScene.tsx`. No sprites, no images.
- **Status:** built.

An old Japanese shrine's training yard, seen from above: a sand courtyard closed in by a red-roofed wall on all four sides. The player and Ryuuko are inside.

The Quest Island has no fixed size. Each quest scene measures the screen and passes its size to `questBg(w, h)`, so every rectangle below is worked out from `w` and `h`.

- `iw = w - 4`, `ih = h - 4`: the room inside the world's 2 px black edge. Sections are placed from inside that edge.
- All sizes are multiples of 4 (one art pixel).

## Sections

In paint order. A later one paints over an earlier one.

| Section | Rectangle `{x, y, w, h}` | Color | Solid | What it is |
|---|---|---|---|---|
| ground | the whole world (`BGProps.color`) | `#e6dcc0` | no | Sand courtyard. The big open area in the middle. |
| `path` | `(iw - 96) / 2, 0, 96, ih` | `#d3cdbf` | no | A stone path up the middle, from the bottom wall to the top wall. |
| `wall-top` | `0, 0, iw, 104` | `#f4efe2` | yes | The far wall: its plaster face shows under its roof. |
| `post-N` | about every 96 px, `y 48`, `8 x 56` | `#b5382e` | no | Red posts on the plaster face. |
| `roof-top` | `0, 0, iw, 48` | `#b5382e` | no (inside `wall-top`) | Red roof of the far wall. |
| `roof-left` | `0, 0, 48, ih` | `#b5382e` | yes | Red roof of the left wall. |
| `roof-right` | `iw - 48, 0, 48, ih` | `#b5382e` | yes | Red roof of the right wall. |
| `roof-bottom` | `0, ih - 48, iw, 48` | `#b5382e` | yes | Red roof of the near wall. |
| `ridge-*` | a 4 px ring, 22 px in from the edge | `#8a2620` | no | The ridge line down the middle of the four roofs. |
| `eave-*` | a 4 px ring, 44 px in from the edge | `#6e1e19` | no | The eave line on the roofs' inner edge. |

## Notes

- **Blocking:** the four `solid` sections are blocking boxes, by the same code as island 2's ocean (see [Blocking](../objects-and-background.md#blocking)). The player stops at a wall and slides along it.
- **Walkable area:** 48 px in from the left, right and bottom, 104 px in from the top.
- **Blocks and bullets** are not stopped by the walls. They fly in over them, as before.
- **Props:** none yet. A torii, stone lanterns or a training dummy would be objects made with `/make-sprite`.

## Tuning

All in `gameScene.tsx`.

| Constant | Value | Meaning |
|---|---|---|
| `SHRINE_ROOF` | 48 | Thickness of each wall's roof. Keep above 18 (the player's longest step in one frame) |
| `SHRINE_FACE` | 56 | Height of the plaster face under the top roof |
| `SHRINE_LINE` | 4 | Width of the ridge and eave lines |
| `SHRINE_POST_W` | 8 | Width of a post |
| `SHRINE_POST_GAP` | 96 | Distance between posts (adjusted so they divide the wall evenly) |
| `SHRINE_PATH_W` | 96 | Width of the stone path |

## Build order

1. `shrineSections(w, h)` and the `SHRINE_*` constants in `gameScene.tsx`.
2. `questBg(w, h)` returns the sand `color` and `sections: shrineSections(w, h)`.
3. Nothing to place: no objects, no entry in `ISLAND_MAPS`.
