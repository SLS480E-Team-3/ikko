import type { NPCProps } from "../Entity/npcRenderer"
import { ENT_H, ENT_W } from "../Entity/entityRenderer"
import { BG_H, BG_W, ISLAND_COUNT, objectHitBoxes } from "../Scene/gameScene"
import { ISLAND_MAPS } from "../islands"
import { ISLAND_1_NPC } from "./npcs"

const mulberry32 = (seed: number) => () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
// tiny deterministic PRNG: the same seed gives the same 0..1 sequence on
// server and client, so seeded NPC spots never cause a hydration mismatch

const GAP = 4
const MARGIN = 40
const MAX_TRIES = 1000
const clear = (x: number, y: number, b: { x: number, y: number, w: number, h: number }) =>
    x + ENT_W / 2 + GAP <= b.x || x - ENT_W / 2 - GAP >= b.x + b.w || y + ENT_H / 2 + GAP <= b.y || y - ENT_H / 2 - GAP >= b.y + b.h
// an NPC body (ENT_W x ENT_H centered on x, y) plus a GAP px margin lies
// fully left, right, above or below box b, same test as MobileTester's
// clearOfObjects

export const placeNpcs = (base: NPCProps[], islandId: number): NPCProps[] => {
    const rand = mulberry32(islandId)
    const boxes = [
        ...objectHitBoxes(ISLAND_MAPS[islandId] ?? []),
        { x: BG_W / 2 - ENT_W / 2, y: BG_H / 2 - ENT_H / 2, w: ENT_W, h: ENT_H },
    ]
    return base.map(n => {
        let x = BG_W / 2, y = BG_H / 2
        for (let i = 0; i < MAX_TRIES; i++) {
            x = Math.round(MARGIN + rand() * (BG_W - MARGIN * 2))
            y = Math.round(MARGIN + rand() * (BG_H - MARGIN * 2))
            if (boxes.every(b => clear(x, y, b))) break
        }
        boxes.push({ x: x - ENT_W / 2, y: y - ENT_H / 2, w: ENT_W, h: ENT_H })
        return { ...n, ent: { ...n.ent, x, y } }
    })
}
// seeded random spot per NPC anywhere in the world (MARGIN px from the
// edges): the island id seeds the PRNG, so each island's spots are fixed
// across loads but differ between islands. A spot is retried while it
// overlaps an object hitBox, the player spawn body (world center) or an
// NPC already placed (each placed body joins boxes). MAX_TRIES caps the
// loop; the last try is kept. Only ent.x/y change, dialog/voice/color stay

export const ISLAND_NPCS: Record<number, NPCProps[]> = Object.fromEntries( // entries: **{ 1: ISLAND_1_NPC }** -> **1..ISLAND_COUNT placed from ISLAND_1_NPC**, reason: every island has the same NPCs at its own random spots, mechanism: placeNpcs seeded by island id, run once at module load
    Array.from({ length: ISLAND_COUNT }, (_, i) => [i + 1, placeNpcs(ISLAND_1_NPC, i + 1)]),
)
// islandId (islands.id in the db) -> that island's NPCs, mirroring
// ISLAND_MAPS. An island with no entry has no NPCs yet; IslandScene falls
// back to an empty list
