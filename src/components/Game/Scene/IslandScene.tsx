'use client'

import Link from "next/link"
import GameScene from "./gameScene"
import { ISLAND_MAPS } from "../islands"

export type IslandSceneProps = {
    islandId: number
    points: number
    quests: { id: number, title: string[], status?: 'done' | 'resume' }[]
}
// everything the island page loaded, as plain data: the page (server) does
// the Supabase work and hands this over, the scene (client) only renders.
// status: 'done' = cleared, 'resume' = started and paused, none = not started

export default function IslandScene({ islandId, points, quests }: IslandSceneProps) { // props: **{ islandId: number }** -> **IslandSceneProps**, mechanism: the page passes points and the quest list along with the id, so the scene can draw them without its own queries
    return (
        <div style={{ position: 'relative', width: '100%', height: '100lvh' }} data-island={islandId}> {/* wrapper: **<div>** -> **relative 100lvh div**, mechanism: GameScene fills 100% of its parent, so this box gives it the full screen height (lvh reaches under the mobile browser's floating URL bar), and position relative anchors the absolute quest list below */}
            <GameScene objects={ISLAND_MAPS[islandId] ?? []} /> {/* props: **none** -> **objects**, mechanism: looks the island's map file up by id; an island without one gets an empty field */}
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
        </div>
    )
}
