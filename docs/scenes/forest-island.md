# Scene: forest-island

- **Island id:** 3
- **Made by:** `/make-scene forest-island 3` (Issue #60)
- **Status:** built (2026-10-19). The 9 new sprites are made and everything is placed on island 3 (`ISLAND_3` in `src/components/Game/islands/islands.ts`, `ISLAND_SECTIONS[3]` in `gameScene.tsx`). Spec: [island-3.spec.json](../island-3.spec.json).

The world is 1400 x 2000 world px. The player spawns at (700, 1000), in the clearing. Island 3 teaches the particles に and で, so the props are words its sentences use (いえ, き, かわ...).

## Sections

| Section | Rectangle `{x, y, w, h}` | Ground | Color | What it is |
|---|---|---|---|---|
| forest | `0, 0, 1400, 800` | dark moss | `#7fae5a` | Dense trees at the top. The player walks between them. |
| clearing | `0, 800, 1400, 800` | light moss | `#a9cf7a` | Open grass with a cabin. The player spawns here. `merge: true`. |
| bank | `0, 1600, 1400, 100` | sand | `#f3e9c6` | A strip of sand on the river's edge. `merge: true`. |
| river | `0, 1700, 1400, 300` | water | `#87ceeb` | The river at the bottom. `merge: true`, `solid: true`: the player stops at the bank. No `wave`. |

Each section's ground is one plain color, with no texture.

## Ground plants

| Section | Four plants | Count |
|---|---|---|
| forest | `fern`, `grass-tuft`, `clover`, `small-bush` (reuse) | 8 |
| clearing | `fern`, `grass-tuft`, `clover`, `small-bush` (reuse) | 8 |
| bank | `pebbles`, `driftwood`, `pebbles`, `driftwood` (reuse) | 3 |

## Props

| Key | Kana | Romaji | English | Section | Blocking | Count | New or reuse |
|---|---|---|---|---|---|---|---|
| `tree` | き | ki | tree | forest | yes | 6 | reuse |
| `pine-tree` | まつ | matsu | pine tree | forest | yes | 4 | new |
| `stump` | きりかぶ | kirikabu | tree stump | forest | yes | 2 | new |
| `cabin` | いえ | ie | house | clearing | yes | 1 | new |
| `woodpile` | まき | maki | firewood | clearing | yes | 2 | new |
| `apple-tree` | りんごのき | ringo no ki | apple tree | clearing | yes | 2 | new |
| `axe` | おの | ono | axe | clearing | no | 1 | new |
| `bridge` | はし | hashi | bridge | river | no | 1 | new |
| `rock` | いわ | iwa | rock | bank | yes | 3 | reuse |
| `fish` | さかな | sakana | fish | river | no | 2 | new |
| `boat` | ふね | fune | boat | bank | yes | 1 | new |

The first placement of each prop carries its sign. The column 100 px either side of the spawn's x stays clear from the bank up into the forest, and nothing is within 120 px of the spawn.

## Build notes

- References: pixabay PNGs (the 640 px versions, no watermark), saved to `python/output/refs/<key>.png`. pngtree blocked downloads and vecteezy previews carry a faint watermark, so neither was used.
- Generation ids (`python/generations.json`): pine-tree `68vWatzFG_Wtz7IP8OSc0Qs`, stump `98vWarajJ8jpz7IP9rKD8Ac`, cabin `A8zWauKxDfKIz7IP9f3G8QM`, woodpile `DczWarDTLL2Ez7IPse_RwAs`, apple-tree `GczWaunZKbis_uMP2YTquAg`, axe `J8zWarOuK73oz7IP7re_wQM`, bridge `MczWasSJN4nUz7IPvuqxgAw`, fish `PMzWarCdEIPDqtsP5ZjcwQ4`, boat `R8zWasXoGJCFz7IPvf2auQM`.
- Scales: tree and pine-tree 0.6, apple-tree 0.5, cabin 1, bridge 0.6, stump / woodpile / rock / boat 0.3, axe / fish 0.15. Ground plants at scatter()'s default 0.12.
- boat's hitBox is set by hand (the printed one was only the bow); the other blocking props keep the printed one.
- The river is solid, so the player can't walk onto the bridge or the fish. The bridge (base dy 850) and the first fish (base dy 726) reach up to within `SIGN_RANGE` of the shore, so their signs show from the bank. The bridge is decoration; it does not let the player cross.
- The river's merge band (`MERGE_H` 160) is taller than the 100 px bank, so the dithered blue edge reaches over much of the sand; the rocks and boat sit at the waterline.
