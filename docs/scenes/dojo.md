# Scene: dojo

- **Island:** the Quest Island (no island id). Used by all three quest scenes: original, dodge, shoot.
- **Made by:** code only, `dojoSections(w, h)` in `src/components/Game/Scene/gameScene.tsx`. No sprites, no image files.
- **Status:** built. It replaces the shrine yard.

A kendo dojo seen from above with the roof off: a tatami floor closed in by four wooden walls. The player and Ryuuko are inside.

- Far (top) wall: its **inside** face.
- Near (bottom) wall: its **outside** face.
- Left and right walls: only their top, a thick wood strip.

The Quest Island has no fixed size. Each quest scene measures the screen and passes its size to `questBg(w, h)`, so every rectangle below is worked out from `w` and `h`.

- `iw = w - 4`, `ih = h - 4`: the room inside the world's 2 px black edge.
- `cx`: the middle of `iw`. `by = ih - 88`: the top of the near wall.
- All sizes are multiples of 4 (one art pixel).

## Sections

In paint order. A later one paints over an earlier one.

| Section | Rectangle `{x, y, w, h}` | Color | Solid | What it is |
|---|---|---|---|---|
| ground | the whole world (`BGProps.color`) | `#d8c877` | no | Straw color under the floor tile |
| `floor` | `0, 0, iw, ih` | `#d8c877` + tatami tile (`#2f3b55` heri, `#b3a255` seams) | no | Tatami floor: upright 128 x 256 px mats, a navy border (heri) on the long sides, a seam on the short sides, laid like bricks |
| `wall-top` | `0, 0, iw, 104` | `#f4efe2` | yes | Far wall, inside face: plaster |
| `panel-top` | `48, 64, iw - 96, 40` | `#8a5a2e` + panel tile | no | Wood panels at the foot of the face |
| `post-N` | about every 96 px, `y 16`, `8 x 88` | `#5a3a1e` | no | Posts on the inside face |
| `kamidana`, `kamidana-step` | `cx - 48, 16, 96, 72` and `cx - 56, 88, 112, 16` | `#3d2a18`, `#6b4424` | no | Alcove in the middle of the far wall, on a raised step |
| `flag`, `flag-dot` | `cx - 20, 48, 40, 28` and `cx - 6, 56, 12, 12` | `#ffffff`, `#c8302a` | no | Flag in the alcove |
| `curtain`, `crest-l`, `crest-r` | `cx - 48, 16, 96, 24`, two `8 x 8` | `#5b3a8c`, `#f4efe2` | no | Purple curtain over the alcove, with two crests |
| `door-frame`, `door`, `door-split` | around `x = 3/4 of iw`, `64 x 72` | `#5a3a1e`, `#c79a5e` | no | Sliding door on the far wall |
| `wall-left`, `wall-right` | `0, 0, 48, ih` and `iw - 48, 0, 48, ih` | `#6b4424` | yes | Side walls, seen from above |
| `cap-top` | `0, 0, iw, 16` | `#6b4424` | no | Top edge of the far wall |
| `edge-top`, `edge-left`, `edge-right` | 4 px lines on the walls' inner side | `#3d2a18` | no | Where a wall meets the floor |
| `wall-bottom` | `0, by, iw, 88` | `#8a5a2e` + siding tile | yes | Near wall, outside face: siding |
| `cap-bottom`, `edge-bottom` | `0, by, iw, 16` and a 4 px line | `#6b4424`, `#3d2a18` | no | Top edge of the near wall |
| `band-bottom` | `0, by + 16, iw, 12` | `#f4efe2` | no | White plaster band |
| `post-out-N` | same x as `post-N`, `y by + 16`, `8 x 72` | `#5a3a1e` | no | Posts on the outside face |
| `window-N`, `glass-N-l/r` | middle of each post gap, `40 x 32` | `#5a3a1e`, `#bcd3d8` | no | Windows. None in the gaps within 80 px of the entrance |
| `entry-frame`, `entry` | `cx - 36`, `72` wide, on the siding | `#5a3a1e`, `#3d2a18` | no | Entrance in the middle of the near wall |
| `base-bottom` | `0, ih - 8, iw, 8` | `#9a9a94` | no | Stone base |

## Line tiles

The tatami, panel and siding lines are tiles made in code by `svgTile(color, rects)`: an SVG of plain rectangles as a data URI. A rectangle can have its own color as a 5th value, put in `BgSection.tile` like an image file. The renderer is not changed.

- The SVG is 64 x 64 units over 256 world px, so 1 unit = 4 world px = one art pixel.
- `DOJO_FLOOR_TILE`: two columns of mats. An 8 px navy band on each column border, and a 4 px seam across each column at a different height, so the mats are laid like bricks.
- `DOJO_PANEL_TILE`: upright lines every 32 px. `DOJO_SIDING_TILE`: level lines every 16 px.
- No line is on the tile's edge (it would look thicker where two tiles meet).

## Notes

- **Blocking:** the four `solid` walls are blocking boxes, by the same code as island 2's ocean (see [Blocking](../objects-and-background.md#blocking)). The player stops at a wall and slides along it.
- **Walkable area:** 48 px in from the left and right, 104 px from the top, 88 px from the bottom.
- **Blocks and bullets** are not stopped by the walls. They fly in over them.
- **Props:** none. The floor is kept clear for the minigames.

## Tuning

All in `gameScene.tsx`.

| Constant | Value | Meaning |
|---|---|---|
| `DOJO_SIDE` | 48 | Thickness of the left and right walls. Keep every solid wall above 18 (the player's longest step in one frame) |
| `DOJO_CAP` | 16 | Top edge of the far and near walls |
| `DOJO_TOP` | 104 | Whole far wall: cap + inside face |
| `DOJO_PANEL` | 40 | Wood panels at the foot of the inside face |
| `DOJO_BOTTOM` | 88 | Whole near wall: cap + outside face |
| `DOJO_BAND` | 12 | Plaster band of the outside face |
| `DOJO_BASE` | 8 | Stone base |
| `DOJO_LINE` | 4 | Edge lines, and the grid things snap to |
| `DOJO_POST_W` | 8 | Width of a post |
| `DOJO_POST_GAP` | 96 | Distance between posts (adjusted so they divide the wall evenly) |

## Build order

1. `svgTile`, the three tiles, `dojoSections(w, h)` and the `DOJO_*` constants in `gameScene.tsx`.
2. `questBg(w, h)` returns the floor `color` and `sections: dojoSections(w, h)`.
3. Nothing to place: no objects, no entry in `ISLAND_MAPS`.
