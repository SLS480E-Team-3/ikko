import type { PlacedObject } from "../Object/gameObject"
import { BG_H, BG_W } from "../Scene/gameScene" // imports: **none** -> **BG_W, BG_H**, mechanism: the tower is placed relative to the world center

export const ISLAND_1: PlacedObject[] = [
    {
        id: 'tower-1',
        def: 'tower',
        x: BG_W / 2 - 192, // x: **3500 - 192** -> **BG_W / 2 - 192**, reason: world shrank to 1400 x 2000, mechanism: same offset from the spawn (world center), so the tower stays above the player
        y: BG_H / 2 - 600, // y: **5000 - 600** -> **BG_H / 2 - 600**, mechanism: same as x, the tower sits fully inside the world (top at y 400)
        interaction: { kind: 'sign', text: 'タワー (tawā) = tower' },
        scale: 0.2
    },
    {
        id: 'tree-1',
        def: 'tree',
        x: BG_W / 2 + 120,
        y: BG_H / 2 - 320,
        interaction: { kind: 'sign', text: 'き (ki) = tree' },
    },
    // the first generated sprite: right of and above the spawn, clear of
    // the tower, close enough to walk to and test the trunk collision
]
// island 1's map: every object placed on it, top-left in world px. The
// tower is centered on x above the spawn point (world center BG_W / 2, BG_H / 2),
// with its base just over the player's head, so walking up reaches it
