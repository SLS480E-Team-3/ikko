import type { PlacedObject } from "../Object/gameObject"
import { ISLAND_1, ISLAND_2, ISLAND_3 } from "./islands" // imports: **ISLAND_1, ISLAND_2** -> **+ ISLAND_3**, mechanism: the volcano map // imports: **ISLAND_1** -> **+ ISLAND_2**, mechanism: the tropical-island map

export const ISLAND_MAPS: Record<number, PlacedObject[]> = {
    1: ISLAND_1,
    2: ISLAND_2, // entry: **none** -> **2: ISLAND_2**, mechanism: island 2 now draws the tropical-island objects
    3: ISLAND_3,
    // island 3 draws the volcano scene's objects
}
// islandId (islands.id in the db) -> that island's map. An island with no
// entry has no objects yet; IslandScene falls back to an empty list
