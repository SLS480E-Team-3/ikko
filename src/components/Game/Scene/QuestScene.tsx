'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import QuestComplete from "../questComplete"
import QuestIsland from "./questIsland" // imports: **GameScene, QUEST_BG, BUBBLE_BG, QUEST_ISLAND_NPC** -> **QuestIsland**, mechanism: QuestIsland owns the bg, NPCs and training
import { DodgeQuestIsland } from "./dodgeQuestIsland" // imports: **QuestIsland only** -> **+ DodgeQuestIsland**, mechanism: island 2's NPCs open the dodge quest
import type { QuestType } from "./tutorial"

export type QuestSceneProps = {
    islandId: number
    quest: { id: number, title: string, reward_points: number, kana: string | null } // quest: **no kana** -> **+ kana**, mechanism: handed to QuestIsland as the training target
    cleared: boolean
    tutorialSeen: boolean
    // whether Hiroko already asked this player about this quest type's
    // tutorial (a user_tutorials row for questType)
    questType: QuestType
    // which quest island to run (islandQuestType): 'dodge' = DodgeQuestIsland,
    // anything else = QuestIsland's catch quest
}
// what the quest page loaded: the quest itself and whether this player
// already cleared it. The page (server) checks access and records the
// start/resume; the scene (client) only renders

export default function QuestScene({ islandId, quest, cleared, tutorialSeen, questType }: QuestSceneProps) { // params: **no questType** -> **+ questType**, mechanism: picks the island component and the tutorial type below // params: **no tutorialSeen** -> **+ tutorialSeen**, mechanism: passed on to QuestIsland as tutorial.seen
    const router = useRouter()
    const Island = questType === 'dodge' ? DodgeQuestIsland : QuestIsland
    // both take the same props (onLeave, kana, tutorial, children = success slot)
    return (
        <div style={{ position: 'relative', width: '100%', height: '100lvh' }}> {/* wrapper: **BUBBLE_BG** -> **no bg**, mechanism: QuestIsland fills this box with the bubble color itself and measures it for the 2x island */}
            <Island
                onLeave={() => router.push(`/Game/${islandId}`)}
                kana={quest.kana ?? undefined}
                tutorial={{
                    seen: tutorialSeen,
                    onSeen: () => { fetch('/api/Tutorial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: questType }) }).catch(() => {}) },
                }}
            > {/* props: **no kana** -> **kana**, mechanism: a quest without a kana trains あ; props: **no tutorial** -> **tutorial**, mechanism: onSeen records the answer in user_tutorials via /api/Tutorial, fire-and-forget so a failed save never blocks the run (she just asks again next time) */}
                {!cleared && <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}><QuestComplete quest={quest.id} points={quest.reward_points} /></div>}
            </Island> {/* scene: **<QuestIsland>** -> **<Island>**, mechanism: DodgeQuestIsland on island 2, QuestIsland elsewhere; onSeen type: **'original'** -> **questType**, mechanism: the dodge tutorial is saved as its own user_tutorials row */}
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
