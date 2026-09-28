'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import QuestComplete from "../questComplete"
import GameScene, { QUEST_BG } from "./gameScene"
import { BUBBLE_BG } from "../Entity/dialogBubble"
import { QUEST_ISLAND_NPC } from "../npcs/npcs"

export type QuestSceneProps = {
    islandId: number
    quest: { id: number, title: string, reward_points: number }
    cleared: boolean
}
// what the quest page loaded: the quest itself and whether this player
// already cleared it. The page (server) checks access and records the
// start/resume; the scene (client) only renders

export default function QuestScene({ islandId, quest, cleared }: QuestSceneProps) {
    const router = useRouter()
    return (
        <div style={{ position: 'relative', width: '100%', height: '100lvh', background: BUBBLE_BG }}> {/* wrapper: **flex column page** -> **relative 100lvh div, BUBBLE_BG**, reason: the quest plays on the Quest Island, mechanism: same box IslandScene gives GameScene; the bubble color hides the lightgreen html bg around a world smaller than the screen */}
            <GameScene bgProps={QUEST_BG} npcs={QUEST_ISLAND_NPC} onQuest={() => router.push(`/Game/${islandId}`)} />
            {/* the 1000 x 700 Quest Island; Kaeru's はい runs onQuest, which
                goes back to the island this quest belongs to */}
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}> {/* overlay: **page content** -> **absolute top-left**, mechanism: floats over the scene like IslandScene's quest list */}
                <Link href={`/Game/${islandId}`}>{'<-'}</Link>
                <div>{quest.title}</div>
                <div style={{ fontSize: '0.75rem' }}>quest content goes here</div>
                {cleared
                    ? <div style={{ fontSize: '0.75rem' }}>cleared!</div>
                    : <QuestComplete quest={quest.id} points={quest.reward_points} />}
            </div>
        </div>
    )
    // the back arrow is "pause": nothing to save beyond the updated_at the
    // page already wrote, so it's a plain link to the island, where this
    // quest now shows "(resume)". The content is a placeholder until lessons
    // are designed; a cleared quest can be reopened but not claimed twice
}
