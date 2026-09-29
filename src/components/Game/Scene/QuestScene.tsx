'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import QuestComplete from "../questComplete"
import QuestIsland from "./questIsland" // imports: **GameScene, QUEST_BG, BUBBLE_BG, QUEST_ISLAND_NPC** -> **QuestIsland**, mechanism: QuestIsland owns the bg, NPCs and training

export type QuestSceneProps = {
    islandId: number
    quest: { id: number, title: string, reward_points: number, kana: string | null } // quest: **no kana** -> **+ kana**, mechanism: handed to QuestIsland as the training target
    cleared: boolean
}
// what the quest page loaded: the quest itself and whether this player
// already cleared it. The page (server) checks access and records the
// start/resume; the scene (client) only renders

export default function QuestScene({ islandId, quest, cleared }: QuestSceneProps) {
    const router = useRouter()
    return (
        <div style={{ position: 'relative', width: '100%', height: '100lvh' }}> {/* wrapper: **BUBBLE_BG** -> **no bg**, mechanism: QuestIsland fills this box with the bubble color itself and measures it for the 2x island */}
            <QuestIsland onLeave={() => router.push(`/Game/${islandId}`)} kana={quest.kana ?? undefined}> {/* props: **no kana** -> **kana**, mechanism: a quest without a kana trains あ */}
                {!cleared && <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}><QuestComplete quest={quest.id} points={quest.reward_points} /></div>}
            </QuestIsland>
            {/* scene: **<GameScene QUEST_BG> + onQuest** -> **<QuestIsland> + onLeave**, mechanism: Elena's はい on the fail screen goes back to the island; the children are the success slot, so COMPLETE shows only after both levels are cleared */}
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8 }}> {/* overlay: **absolute top-left** -> unchanged; placeholder text removed, mechanism: the training is the content now */}
                <Link href={`/Game/${islandId}`}>{'<-'}</Link>
                {/* <div>{quest.title}</div> */}
                {cleared && <div style={{ fontSize: '0.75rem' }}>cleared!</div>}
            </div>
        </div>
    )
    // the back arrow is "pause": nothing to save beyond the updated_at the
    // page already wrote, so it's a plain link to the island, where this
    // quest now shows "(resume)". The training can be replayed on a cleared
    // quest, but COMPLETE only shows when it isn't cleared, so no double claim
}
