import type { PlacedObject } from "../Object/gameObject"
import { ISLAND_1, ISLAND_2, ISLAND_5 } from "./islands" // imports: **ISLAND_1, 2, 3** -> **ISLAND_1, 2, 5**, mechanism: islands renumbered (1 -> 5, 2 -> 1, 3 -> 2) // imports: **ISLAND_1, ISLAND_2** -> **+ ISLAND_3**, mechanism: the volcano map // imports: **ISLAND_1** -> **+ ISLAND_2**, mechanism: the tropical-island map

export const ISLAND_MAPS: Record<number, PlacedObject[]> = {
    1: ISLAND_1, // entry: **2: ISLAND_2** -> **1: ISLAND_1**, mechanism: the tropical island is island 1 now
    2: ISLAND_2, // entry: **3: ISLAND_3** -> **2: ISLAND_2**, mechanism: the volcano is island 2 now
    5: ISLAND_5, // entry: **1: ISLAND_1** -> **5: ISLAND_5**, mechanism: the tower / tree / Tokyo-tower map is island 5 now
}
// islandId (islands.id in the db) -> that island's map. An island with no
// entry has no objects yet; IslandScene falls back to an empty list
