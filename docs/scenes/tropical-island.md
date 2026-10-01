# Scene: tropical-island

- **Island id:** 2
- **Made by:** `/make-scene tropical-island 2`
- **Status:** built. The sprites are made and placed on island 2.

The world is 1400 x 2000 world px. The player spawns at (700, 1000), inside the beach.

## Sections

| Section | Rectangle `{x, y, w, h}` | Ground | Tile | Color | What it is |
|---|---|---|---|---|---|
| volcano | `0, 0, 1400, 500` | red-brown volcano sand | none | `#8f4a36` | Scorched rock at the far top. The player reaches it last. |
| forest | `0, 500, 1400, 400` | moss, light green | none | `#a9cf7a` | A band of trees between the beach and the volcano. |
| beach | `0, 900, 1400, 800` | sand, off-white and a bit yellow | none | `#f3e9c6` | Open sand. The player spawns here and walks freely. |
| ocean | `0, 1700, 1400, 300` | water, sky blue | none | `#87ceeb` | The sea below the sand, at the bottom of the world. `solid: true`: the player stops at the shore. `wave: true`: the water and its shore rise 40 px and fall back every 4 s, and the rising water pushes the player up. |

The ground of each section is one plain color, with no texture.

The borders are merged: `forest`, `beach` and `ocean` have `merge: true`, so each one's color reaches up over its top border through the mask `/img/bg/merge.webp` (`python sprite.py merge`). The edge between two soils is then a wavy, dithered line, not a straight one.

## Ground plants

Small walk-through decorations scattered over each section by `scatter()`. They have no sign.

| Section | Four plants | Count |
|---|---|---|
| beach | `beach-grass`, `seashell`, `starfish`, `driftwood` | 9 |
| forest | `fern`, `grass-tuft`, `clover`, `small-bush` | 6 |
| volcano | `dry-grass`, `dead-twig`, `ember`, `pebbles` | 6 |

## Props

| Key | Kana | Romaji | English | Section | Blocking | Count | New or reuse |
|---|---|---|---|---|---|---|---|
| `palm-tree` | やしのき | yashi no ki | palm tree | beach | yes | 2 | new |
| `tree` | き | ki | tree | forest | yes | 3 | reuse |
| `mushroom` | きのこ | kinoko | mushroom | forest | no | 2 | new |
| `volcano` | かざん | kazan | volcano | volcano | yes | 1 | new |
| `lava-lake` | ようがん | yōgan | lava | volcano | yes | 1 | new |
| `rock` | いわ | iwa | rock | volcano | yes | 2 | new |
| `fire` | ひ | hi | fire | volcano | no | 2 | new |

New props: 6. New ground plants: 12.

## Build order

1. `/make-sprite` for each new prop, in table order.
2. `python sprite.py make <plant>` for each ground plant (no reference image).
3. `python sprite.py merge` once if `public/img/bg/merge.webp` is missing.
4. Place: `ISLAND_2` in `src/components/Game/islands/islands.ts`, registered in `ISLAND_MAPS`; the ground plants with three `scatter()` calls in `ISLAND_2`; the four sections (`color`, and `merge: true` on forest, beach and ocean, `solid: true` on ocean) in `ISLAND_SECTIONS` in `src/components/Game/Scene/gameScene.tsx`.
