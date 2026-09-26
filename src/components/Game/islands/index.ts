import type { PlacedObject } from "../Object/gameObject"
import { ISLAND_1 } from "./island_1"

export const ISLAND_MAPS: Record<number, PlacedObject[]> = {
    1: ISLAND_1,
}
// islandId (islands.id in the db) -> that island's map. An island with no
// entry has no objects yet; IslandScene falls back to an empty list
