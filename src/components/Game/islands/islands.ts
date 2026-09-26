import type { PlacedObject } from "../Object/gameObject"

export const ISLAND_1: PlacedObject[] = [
    {
        id: 'tower-1',
        def: 'tower',
        x: 3500 - 192,
        y: 5000 - 600,
        interaction: { kind: 'sign', text: 'タワー (tawā) = tower' },
    },
]
// island 1's map: every object placed on it, top-left in world px. The
// tower is centered on x above the spawn point (world center 3500, 5000),
// with its base just over the player's head, so walking up reaches it
