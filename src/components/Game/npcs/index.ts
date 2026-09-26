import type { NPCProps } from "../Entity/npcRenderer"
import { ISLAND_1_NPC } from "./npcs"

export const ISLAND_NPCS: Record<number, NPCProps[]> = {
    1: ISLAND_1_NPC,
}
// islandId (islands.id in the db) -> that island's NPCs, mirroring
// ISLAND_MAPS. An island with no entry has no NPCs yet; IslandScene falls
// back to an empty list
