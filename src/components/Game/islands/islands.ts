import type { Interaction, PlacedObject } from "../Object/gameObject"
import { OBJECTS } from "../Object/objects"
import { BG_H, BG_W } from "../Scene/gameScene" // imports: **none** -> **BG_W, BG_H**, mechanism: the tower is placed relative to the world center

const place = (id: string, def: string, dx: number, dy: number, scale = 1, interaction?: Interaction): PlacedObject => {
    const { w, h } = OBJECTS[def].sprite
    return {
        id,
        def,
        x: BG_W / 2 + dx - (w * scale) / 2,
        y: BG_H / 2 + dy - h * scale,
        interaction,
        scale,
    }
}
// places an object by where its base stands: (dx, dy) is the bottom-center
// of the sprite, in world px from the spawn (world center; -x = left,
// -y = up). The top-left that PlacedObject stores is worked out from the
// catalog's sprite size times scale, so no sprite width / height is typed
// into the map, and changing scale or the sprite keeps the base in place

const SPAWN_CLEAR = 120
const scatter = (prefix: string, defs: string[], rect: { dx: number, dy: number, w: number, h: number }, count: number, seed: number, scale = 0.12): PlacedObject[] => {
    let s = seed
    const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0
        return s / 4294967296
    }
    const out: PlacedObject[] = []
    for (let tries = 0; out.length < count && tries < count * 20; tries++) {
        const dx = Math.round(rect.dx + rand() * rect.w)
        const dy = Math.round(rect.dy + rand() * rect.h)
        if (Math.hypot(dx, dy) < SPAWN_CLEAR) continue
        out.push(place(`${prefix}-${out.length + 1}`, defs[out.length % defs.length], dx, dy, scale))
    }
    return out
}
// scatters `count` decorations over a rectangle (dx, dy = its top-left from
// the spawn, like place()). The positions come from a small seeded generator
// (a linear congruential one), not Math.random, so the layout is the same on
// every load and the same on the server and the client. Each position is the
// sprite's base, passed to place(); the defs are used in turn, so each of
// the four plants appears about count / 4 times. A position closer than
// SPAWN_CLEAR to the spawn is thrown away and drawn again. A different seed
// gives a different layout

export const ISLAND_1: PlacedObject[] = [
    place('tower-1', 'tower', -154, -494, 0.2, { kind: 'sign', text: 'タワー (tawā) = tower' }), // x, y: **BG_W / 2 - 192, BG_H / 2 - 600** -> **place(dx -154, dy -494)**, mechanism: the old offsets had the scaled sprite size mixed in; place() takes the base position and reads the size from the catalog. Same spot on screen
    place('tree-1', 'tree', 197, -178, 0.6, { kind: 'sign', text: 'き (ki) = tree' }), // x, y: **BG_W / 2 + 120, BG_H / 2 - 320** -> **place(dx 197, dy -178)**, mechanism: same as the tower
    place('tokyo-tower-1', 'Tokyo-tower', -243, -62, 0.6, { kind: 'sign', text: 'とうきょうタワー (Tōkyō tawā) = Tokyo Tower' }), // x, y: **BG_W / 2 - 320, BG_H / 2 - 420** -> **place(dx -243, dy -62)**, mechanism: same as the tower
]
// island 1's map: every object placed on it. The temp tower stands far above
// the spawn, the tree to the upper right, and Tokyo-tower to the upper left
// with its base 62 px above the spawn's y

export const ISLAND_2: PlacedObject[] = [
    // beach (world y 900-1700, dy -100..700)
    place('palm-tree-1', 'palm-tree', -220, 60, 0.6, { kind: 'sign', text: 'やしのき (yashi no ki) = palm tree' }),
    place('palm-tree-2', 'palm-tree', 260, 240, 0.6),
    // forest (world y 500-900, dy -500..-100)
    place('tree-2-1', 'tree', -450, -180, 0.6, { kind: 'sign', text: 'き (ki) = tree' }),
    place('tree-2-2', 'tree', -250, -330, 0.6),
    place('tree-2-3', 'tree', 280, -200, 0.6),
    // place('mushroom-1', 'mushroom', -540, -380, 0.15, { kind: 'sign', text: 'きのこ (kinoko) = mushroom' }),
    // place('mushroom-2', 'mushroom', 200, -420, 0.15),
    // volcano (world y 0-500, dy -1000..-500)
    place('volcano-1', 'volcano', 0, -630, 2, { kind: 'sign', text: 'かざん (kazan) = volcano' }), // scale: **1.4** -> **2**, mechanism: the remade volcano sprite is half as tall (256x132, was 256x256), so it is drawn larger to stay the landmark of the section (512x264 world px)
    // place('lava-lake-1', 'lava-lake', -400, -640, 0.2, { kind: 'sign', text: 'ようがん (yōgan) = lava' }),
    // place('rock-1', 'rock', 330, -600, 0.3, { kind: 'sign', text: 'いわ (iwa) = rock' }),
    // place('rock-2', 'rock', 520, -760, 0.3),
    place('fire-1', 'fire', -210, -560, 0.2, { kind: 'sign', text: 'ひ (hi) = fire' }),
    place('fire-2', 'fire', 250, -800, 0.2),
    // ...scatter('beach-plant', ['beach-grass', 'seashell', 'starfish', 'driftwood'], { dx: -660, dy: -60, w: 1320, h: 720 }, 9, 11), // h, count: **1040, 12** -> **720, 9**, mechanism: the beach now ends at world y 1700 (the ocean is below it), so the rectangle stops 40 px above the shore and the count drops with the area
    // ...scatter('forest-plant', ['fern', 'grass-tuft', 'clover', 'small-bush'], { dx: -660, dy: -460, w: 1320, h: 350 }, 6, 22),
    // ...scatter('volcano-plant', ['dry-grass', 'dead-twig', 'ember', 'pebbles'], { dx: -660, dy: -940, w: 1320, h: 430 }, 6, 33),
] // ground plants: **none** -> **three scatter() calls**, mechanism: the sections are flat colors now, so four small walk-through plants per section are spread over each band in place of a texture. Each rectangle sits 40 px inside its section so no plant's base crosses a border; the beach is the tallest band, so it gets 12, the others 6 (one or two in a phone view)
// amount and size: **32 / 18 / 18 plants at scale 0.2, 26 props** -> **12 / 6 / 6 plants at scale 0.12, 21 props**, mechanism: the island was crowded and the small things were too large. scatter()'s default scale is 0.12 (a plant is about 31 world px wide, was 51); coconut, apple and banana are 0.12, flower and mushroom 0.15, rock 0.3, fire 0.2; one repeat each of palm-tree, coconut, tree, flower and rock is removed. Every word still has its signed first placement
// props: **21, with coconut, apple, flower and banana** -> **13**, mechanism: the two placements of each of the four are removed (and their catalog entries in objects.ts); the beach keeps the palm trees, the forest the trees and mushrooms
// island 2's map, the tropical-island scene (docs/scenes/tropical-island.md).
// Each object stands inside its ground section (ISLAND_SECTIONS[2] in
// gameScene.tsx): beach around and below the spawn, forest above it, volcano
// at the top. The column 100 px either side of the spawn's x is left clear
// from the beach up through the forest, so the player walks straight up to
// the volcano's foot. Nothing is within 120 px of the spawn. The first
// placement of each prop carries the sign with its word; the repeats are
// silent. Ids of the trees are tree-2-N because tree-1 is on island 1

export const ISLAND_3: PlacedObject[] = [
    place('volcano-3-1', 'volcano', 0, -630, 2, { kind: 'sign', text: 'かざん (kazan) = volcano' }),
]
// island 3's map, the volcano scene (docs/scenes/volcano.md): the same
// volcano as island 2, at the same place and scale (base 630 px above the
// spawn, 512x264 world px). The id is volcano-3-1 because volcano-1 is on
// island 2. The ground is red soil down to the magma (ISLAND_SECTIONS[3] in
// gameScene.tsx)
