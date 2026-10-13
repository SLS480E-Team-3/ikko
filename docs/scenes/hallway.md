# Scene: door room (hallway)

- **Used by:** the Left or Right quest (`leftRightQuestIsland.tsx`, spec `docs/left-or-right.spec.json`).
- **Made by:** code only. `hallSections(w, h, doors)` and `hallBg(...)` live in `src/components/Game/Scene/gameScene.tsx`; the door layout lives in `src/components/Game/Scene/leftRightTraining.ts`. No sprites, no image files.
- **Status:** built.

The scene is one small wooden room seen from above, with the dojo's walls (same colors, caps and shadow edges). It is exactly as wide as the door row: two doors side by side with nothing between them, and no floor at the sides. The doors stand fully in the back (far) wall's face, their bottom edge on the floor line. The file and function names still say "hall".

## Size

| | Value | From |
|---|---|---|
| Width `w` | 284 | `HALL_W` = 2 × `DOOR_W` (92) + 2 × `DOJO_SIDE` (48) + 2 × border (2) |
| Height `h` | 456 (fixed) | `hallH()`: back wall (with the doors in it) + `CORRIDOR` (200) + spawn lift (60) + near wall |

The camera centers a world narrower than the screen. On a phone (zoom 1.5) the hall fills the width.

## Top to bottom (y inside the world's border, the frame sections, `renderWorld` and the player share)

| What | Where | Notes |
|---|---|---|
| Back wall | `0 – 104` | Plaster + wood panels, solid |
| Door row | `8 – 104` | In the back wall's face, bottom on the floor line. Red door `x 48–140`, blue door `140–232`, touching. Drawn by the quest's `renderWorld` |
| Floor | `104 – 304` | Plank floor, 200 px from the doors to the spawn |
| Ryuuko at start | `spawn - 80` | `startSpot` |
| Spawn | `h - 150` | `spawnSpot` |
| Near wall | `h - 92 – h - 4` | Cap, plaster band, siding, stone base, solid |

The word sign is no longer in the world. It is a box fixed at the top of the screen (`leftRightQuestIsland.tsx`, from `getSign()`), shown only while playing.

## Doors and the wall

The doors aren't sections. In this room the player's hit box is only their feet: the bottom 8 px of the body (`FEET_H`, passed to `GameScene` as `feetH`). So the body walks up over the doors, and the solid back wall stops the feet at the doors' bottom edge. The quest checks that feet box against the whole door row plus 6 px below it (`DOOR_REACH`). On a touch, the door is the half of the row that the player's center x is in. There is no `wallY`. Other scenes don't pass `feetH` and keep whole-body collision.

## Black-screen transition

Going through a correct door fades the screen to black (250 ms), moves the player while it's black, holds (150 ms), then fades back (300 ms). Questions 1-9 move the player back to the spawn. The 10th also moves them back to the spawn: they come out into the "next room", which is the same room, with Ryuuko and Elena standing in front of them, and her clear talk opens. A replay fades the same way. `fadeTo` / `getFade` live in `leftRightTraining.ts`, and the overlay in `leftRightQuestIsland.tsx`.

## Floor tile

`HALL_PLANK_TILE` is an `svgTile` 64 units (256 px) square:

- four upright planks, 16 units (64 px) wide;
- a `#7d5229` seam on each plank's right edge;
- one end joint per plank, at staggered heights.

The tile is laid on `#a9743f`, with `tileX: DOJO_SIDE` so a plank starts at the left wall.
