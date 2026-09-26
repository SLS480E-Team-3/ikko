'use client'

import Link from "next/link"
import QuestComplete from "../questComplete"

export type QuestSceneProps = {
    islandId: number
    quest: { id: number, title: string, reward_points: number }
    cleared: boolean
}
// what the quest page loaded: the quest itself and whether this player
// already cleared it. The page (server) checks access and records the
// start/resume; the scene (client) only renders

export default function QuestScene({ islandId, quest, cleared }: QuestSceneProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, width: '100%', boxSizing: 'border-box', minHeight: '100lvh' }}>
            <Link href={`/Game/${islandId}`}>{'<-'}</Link>
            <div>{quest.title}</div>
            <div style={{ fontSize: '0.75rem' }}>quest content goes here</div>
            {cleared
                ? <div style={{ fontSize: '0.75rem' }}>cleared!</div>
                : <QuestComplete quest={quest.id} points={quest.reward_points} />}
        </div>
    )
    // the back arrow is "pause": nothing to save beyond the updated_at the
    // page already wrote, so it's a plain link to the island, where this
    // quest now shows "(resume)". The content is a placeholder until lessons
    // are designed; a cleared quest can be reopened but not claimed twice
}
