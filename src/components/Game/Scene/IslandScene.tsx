'use client'

import Link from "next/link"
import { useRouter } from "next/navigation" // imports: **none** -> **useRouter**, mechanism: an NPC's はい opens the quest page
import GameScene, { ISLAND_COUNT, islandBg } from "./gameScene" // imports: **GameScene** -> **+ ISLAND_COUNT, islandBg**, mechanism: per-island bg color and the bounds for the prev/next links
import { ISLAND_MAPS } from "../islands"
import { ISLAND_NPCS } from "../npcs" // imports: **none** -> **ISLAND_NPCS**, mechanism: the per-island NPC lists, looked up by id like the maps

export type IslandSceneProps = {
    islandId: number
    points: number
    quests: { id: number, title: string, kana: string | null, status?: 'done' | 'resume' }[] // quest: **no kana** -> **+ kana**, mechanism: matched to NPCProps.kana
}
// everything the island page loaded, as plain data: the page (server) does
// the Supabase work and hands this over, the scene (client) only renders.
// status: 'done' = cleared, 'resume' = started and paused, none = not started

export default function IslandScene({ islandId, points, quests }: IslandSceneProps) { // props: **{ islandId: number }** -> **IslandSceneProps**, mechanism: the page passes points and the quest list along with the id, so the scene can draw them without its own queries
    const router = useRouter()
    const npcs = (ISLAND_NPCS[islandId] ?? []).map(n => {
        const quest = quests.find(q => q.kana && q.kana === n.kana)
        return quest ? { ...n, quest } : { ...n, dialog: n.dialog?.filter(d => d.condition !== 'quest') }
    })
    // each NPC offers the quest with its own kana (Shuto あ, Jordi い, ...);
    // pickDialog skips the ask once that quest is done. An NPC with no
    // matching quest (other islands, or before the SQL) loses its 'quest'
    // entry, so it talks normally even though onQuest is always set
    return (
        <div style={{ position: 'relative', width: '100%', height: '100lvh' }} data-island={islandId}> {/* wrapper: **<div>** -> **relative 100lvh div**, mechanism: GameScene fills 100% of its parent, so this box gives it the full screen height (lvh reaches under the mobile browser's floating URL bar), and position relative anchors the absolute quest list below */}
            <GameScene key={islandId} bgProps={islandBg(islandId)} objects={ISLAND_MAPS[islandId] ?? []} npcs={npcs} onQuest={i => { const q = npcs[i]?.quest; if (q) router.push(`/Game/${islandId}/${q.id}`) }} /> {/* onQuest: **island's first uncleared quest** -> **the talking NPC's quest**, mechanism: GameScene passes the NPC index, its quest id picks the URL */} {/* props: **no onQuest** -> **onQuest**, mechanism: はい pushes the same URL the quest links use, so the quest page's guards still apply */} {/* props: **no key, default bg** -> **key={islandId}, bgProps={islandBg(islandId)}**, mechanism: GameScene reads bgProps/player once at mount, so the key remounts it per island; islandBg swaps in that island's color */} {/* props: **objects** -> **+ npcs**, mechanism: island 1 gets ISLAND_1_NPC (5 food-talk NPCs); an island without an entry gets none */} {/* props: **none** -> **objects**, mechanism: looks the island's map file up by id; an island without one gets an empty field */}
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>points: {points}</div>
                {quests.map(q => (
                    <Link key={q.id} href={`/Game/${islandId}/${q.id}`}>
                        {q.title}{q.status && ` (${q.status})`}
                    </Link>
                ))}
            </div>
            {/* placeholder quest list: one link per quest, tapping one starts
                it (or resumes a paused one) on /Game/[island]/[quest]. zIndex 2
                clears the scene's touch overlay (zIndex 1). Later the quests
                become things placed in the scene itself */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 2, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <span style={{ pointerEvents: 'auto' }}>{islandId > 1 && <Link href={`/Game/${islandId - 1}`}>◀ island {islandId - 1}</Link>}</span>
                <span style={{ pointerEvents: 'auto' }}>{islandId < ISLAND_COUNT && <Link href={`/Game/${islandId + 1}`}>island {islandId + 1} ▶</Link>}</span>
            </div>
            {/* island traversal: plain links to the neighbour island, shown
                only inside 1..ISLAND_COUNT. The page's existing lock check
                redirects a locked or missing island back home, so no extra
                logic here. The row itself ignores pointers so the joystick
                area between the two links stays usable */}
        </div>
    )
}
