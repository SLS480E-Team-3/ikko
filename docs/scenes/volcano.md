# Scene: volcano

- **Island id:** 3
- **Status:** built.

The world is 1400 x 2000 world px. The player spawns at (700, 1000), on the red soil.

## Sections

| Section | Rectangle `{x, y, w, h}` | Ground | Tile | Color | What it is |
|---|---|---|---|---|---|
| volcano | `0, 0, 1400, 1700` | red-brown volcano soil | none | `#7a3f2e` | Island 2's volcano soil, a bit darker, from the top down to the magma. |
| magma | `0, 1700, 1400, 300` | magma, orange | none | `#f08a24` | Magma at the bottom of the world. `merge: true`: an uneven, dithered shore. `solid: true`: the player stops at its edge. `wave: true`: it rises 40 px and falls back every 4 s, and pushes the player up. |

The magma works like island 2's ocean; only the color is different. See [objects-and-background.md](../objects-and-background.md#waves).

## Props

| Key | Kana | Romaji | English | Section | Blocking | Count | New or reuse |
|---|---|---|---|---|---|---|---|
| `volcano` | かざん | kazan | volcano | volcano | yes | 1 | reuse (island 2's sprite, same place and scale) |

## Where it is in the code

- Sections: `ISLAND_SECTIONS[3]` in `src/components/Game/Scene/gameScene.tsx`.
- Map: `ISLAND_3` in `src/components/Game/islands/islands.ts`, registered in `ISLAND_MAPS`.
