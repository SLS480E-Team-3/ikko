// DEV
'use client'

import { CSSProperties, useEffect, useState } from "react"
import { ISLAND_BGM, playBgm } from "@/components/Game/Entity/voice"
import GameScene, { ISLAND_COUNT, islandBg } from "@/components/Game/Scene/gameScene"
import { ISLAND_MAPS } from "@/components/Game/islands"
import { BUBBLE_BG } from "@/components/Game/Entity/dialogBubble"
import { npcsForRow } from "@/components/Game/npcs/npcs"
import QuestIsland from "@/components/Game/Scene/questIsland"
import { ISLAND_NPCS } from "@/components/Game/npcs"
import { KANA_ROWS } from "@/components/Game/kana"
// MobileTester's 'game scene' page, moved here so /MobDev/GameScene?island=N can show it
// full-screen on a phone too

export default function IslandPreview({ sensitivity, start = 1 }: { sensitivity?: number, start?: number }) { // props: **sensitivity** -> **+ start, sensitivity optional**, mechanism: /MobDev/GameScene?island=N opens on island N; GameScene falls back to SENSITIVITY_DEF
    const [island, setIsland] = useState(Math.min(ISLAND_COUNT, Math.max(1, start))) // initial: **1** -> **start, clamped to 1..ISLAND_COUNT**, mechanism: a bad ?island= still opens a real island
    const [row, setRow] = useState(0)
    // the kana row the NPCs offer (0 = あ–お): with no login there's no quest
    // progress, so the row buttons stand in for clearing a row
    const npcs = npcsForRow(ISLAND_NPCS[island] ?? [], row)
    const [inQuest, setInQuest] = useState<string | false>(false) // inQuest: **boolean** -> **kana | false**, mechanism: holds the kana of the NPC whose quest was accepted
    const btn: CSSProperties = { padding: '8px 12px' }
    useEffect(() => {
        const url = inQuest ? undefined : ISLAND_BGM[island]
        return url ? playBgm(url) : undefined
    }, [island, inQuest])
    // same island BGM as IslandScene: it loops while the island is shown and
    // stops for the quest island, like the real game leaving for a quest page.
    // Placed above the early return so the hook order never changes
    if (inQuest) return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: BUBBLE_BG }}>
            <QuestIsland key={`quest-${island}`} kana={inQuest} sensitivity={sensitivity} onLeave={() => setInQuest(false)} /> {/* scene: **<GameScene QUEST_BG>** -> **<QuestIsland>**, mechanism: same training island as the tab; onLeave returns to the island in place */}
            {/* <span style={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>quest island (from island {island})</span> */} {/* label: **shown** -> **commented out**, mechanism: hidden for now; uncomment to show which island the quest came from */}
        </div>
    )
    // Shuto's はい swaps in the Quest Island, Kaeru's はい swaps back to the
    // same island: the no-login stand-in for QuestScene's router.push
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <GameScene key={`${island}-${row}`} sensitivity={sensitivity} bgProps={islandBg(island)} objects={ISLAND_MAPS[island] ?? []} npcs={npcs} onQuest={i => setInQuest(npcs[i]?.kana ?? 'あ')} /> {/* npcs: **ISLAND_NPCS[island]** -> **npcsForRow(..., row)**, mechanism: kana and quest line follow the row; key: **island** -> **island-row**, mechanism: remounts GameScene so the new NPC lines show */} {/* onQuest: **setInQuest(true)** -> **setInQuest(npc kana)**, mechanism: the training targets the kana of the NPC that asked */} {/* onQuest: **alert** -> **setInQuest(true)**, mechanism: はい renders the Quest Island in place instead of only alerting */}
            <div style={{ position: 'absolute', bottom: 64, left: 16, right: 16, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={row <= 0} onClick={() => setRow(r => Math.max(0, r - 1))}>◀ row</button>
                <span>row {KANA_ROWS[row].join('')}</span>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={row >= KANA_ROWS.length - 1} onClick={() => setRow(r => Math.min(KANA_ROWS.length - 1, r + 1))}>row ▶</button>
            </div>
            {/* kana row switcher, one line above the island buttons: same
                layout, steps row through KANA_ROWS */}
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={island <= 1} onClick={() => setIsland(i => Math.max(1, i - 1))}>◀ prev</button>
                <span>island {island}</span>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={island >= ISLAND_COUNT} onClick={() => setIsland(i => Math.min(ISLAND_COUNT, i + 1))}>next ▶</button>
            </div>
        </div>
    )
}
// island traversal without login: the same buttons /Game shows as links,
// but switching in place. key={island} remounts GameScene so the new
// bg color and spawn take effect (it reads them once at mount); islands
// without a map file get an empty field
