// DEV
'use client'

import { CSSProperties, /* useEffect, */ useState } from "react" // imports: **useEffect** -> **commented out**, mechanism: its only use, the island BGM, is commented out
// import { ISLAND_BGM, playBgm } from "@/components/Game/Entity/voice" // music: **on** -> **commented out**, reason: BGM and quest clear / fail music turned off for now, mechanism: uncomment to bring it back
import GameScene, { ISLAND_COUNT, islandBg } from "@/components/Game/Scene/gameScene"
import { ISLAND_MAPS } from "@/components/Game/islands"
import { BUBBLE_BG } from "@/components/Game/Entity/dialogBubble"
import { npcsForRow } from "@/components/Game/npcs/npcs"
import QuestIsland from "@/components/Game/Scene/questIsland"
import { DodgeQuestIsland } from "@/components/Game/Scene/dodgeQuestIsland" // imports: **none** -> **DodgeQuestIsland**, mechanism: island 2's NPCs open the dodge quest, like QuestScene
import { islandQuestType } from "@/utils/islands"
import { ISLAND_NPCS } from "@/components/Game/npcs"
import { KANA_ROWS } from "@/components/Game/kana"
// MobileTester's 'game scene' page, moved here so /MobDev/GameScene?island=N can show it
// full-screen on a phone too

export default function IslandPreview({ sensitivity, start = 1, tint = false }: { sensitivity?: number, start?: number, tint?: boolean }) { // props: **sensitivity, start** -> **+ tint**, reason: the page color around the scene stayed on the first island after next ▶, mechanism: tint is drawn here, where the current island is known // props: **sensitivity** -> **+ start, sensitivity optional**, mechanism: /MobDev/GameScene?island=N opens on island N; GameScene falls back to SENSITIVITY_DEF // props: **sensitivity** -> **+ start, sensitivity optional**, mechanism: /MobDev/GameScene?island=N opens on island N; GameScene falls back to SENSITIVITY_DEF
    const [island, setIsland] = useState(Math.min(ISLAND_COUNT, Math.max(1, start))) // initial: **1** -> **start, clamped to 1..ISLAND_COUNT**, mechanism: a bad ?island= still opens a real island
    const [row, setRow] = useState(0)
    // the kana row the NPCs offer (0 = あ–お): with no login there's no quest
    // progress, so the row buttons stand in for clearing a row
    const npcs = npcsForRow(ISLAND_NPCS[island] ?? [], row)
    const [inQuest, setInQuest] = useState<string | false>(false) // inQuest: **boolean** -> **kana | false**, mechanism: holds the kana of the NPC whose quest was accepted
    const btn: CSSProperties = { padding: '8px 12px' }
    // useEffect(() => {
    //     const url = inQuest ? undefined : ISLAND_BGM[island]
    //     return url ? playBgm(url) : undefined
    // }, [island, inQuest]) // music: **on** -> **commented out**, reason: BGM and quest clear / fail music turned off for now, mechanism: uncomment to bring it back
    // same island BGM as IslandScene: it loops while the island is shown and
    // stops for the quest island, like the real game leaving for a quest page.
    // Placed above the early return so the hook order never changes
    const pageTint = tint && <style>{`html, body { background-color: ${inQuest ? BUBBLE_BG : islandBg(island).color}; }`}</style>
    // with tint (full-screen /MobDev), paints the page behind the scene in the
    // current island's ground color, or the quest's cream while in a quest,
    // so Safari's strips above and below follow prev / next. Off in
    // MobileTester, where the page around the phone frame should stay as is
    if (inQuest) return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: BUBBLE_BG }}>
            {pageTint}
            {islandQuestType(island) === 'dodge'
                ? <DodgeQuestIsland key={`quest-${island}`} kana={inQuest} sensitivity={sensitivity} onLeave={() => setInQuest(false)} />
                : <QuestIsland key={`quest-${island}`} kana={inQuest} sensitivity={sensitivity} onLeave={() => setInQuest(false)} />} {/* scene: **<QuestIsland> always** -> **DodgeQuestIsland on island 2**, mechanism: islandQuestType, the same pick QuestScene makes */} {/* scene: **<GameScene QUEST_BG>** -> **<QuestIsland>**, mechanism: same training island as the tab; onLeave returns to the island in place */}
            {/* <span style={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}>quest island (from island {island})</span> */} {/* label: **shown** -> **commented out**, mechanism: hidden for now; uncomment to show which island the quest came from */}
        </div>
    )
    // Shuto's はい swaps in the Quest Island, Kaeru's はい swaps back to the
    // same island: the no-login stand-in for QuestScene's router.push
    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {pageTint}
            <GameScene key={`${island}-${row}`} sensitivity={sensitivity} bgProps={islandBg(island)} objects={ISLAND_MAPS[island] ?? []} npcs={npcs} onQuest={i => setInQuest(npcs[i]?.kana ?? 'あ')} /> {/* npcs: **ISLAND_NPCS[island]** -> **npcsForRow(..., row)**, mechanism: kana and quest line follow the row; key: **island** -> **island-row**, mechanism: remounts GameScene so the new NPC lines show */} {/* onQuest: **setInQuest(true)** -> **setInQuest(npc kana)**, mechanism: the training targets the kana of the NPC that asked */} {/* onQuest: **alert** -> **setInQuest(true)**, mechanism: はい renders the Quest Island in place instead of only alerting */}
            <div style={{ position: 'absolute', bottom: 'calc(var(--safe-bottom) + 128px)', left: 16, right: 16, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={row <= 0} onClick={() => setRow(r => Math.max(0, r - 1))}>◀ row</button>
                <span>row {KANA_ROWS[row].join('')}</span>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={row >= KANA_ROWS.length - 1} onClick={() => setRow(r => Math.min(KANA_ROWS.length - 1, r + 1))}>row ▶</button>
            </div>
            {/* bottom: **64** -> **safe-bottom + 128px**, reason: stays one line above the island buttons, which moved up, mechanism: same 48px gap as before */}
            {/* kana row switcher, one line above the island buttons: same
                layout, steps row through KANA_ROWS */}
            <div style={{ position: 'absolute', bottom: 'calc(var(--safe-bottom) + 80px)', left: 16, right: 16, zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={island <= 1} onClick={() => setIsland(i => Math.max(1, i - 1))}>◀ prev</button>
                <span>island {island}</span>
                <button style={{ ...btn, pointerEvents: 'auto' }} disabled={island >= ISLAND_COUNT} onClick={() => setIsland(i => Math.min(ISLAND_COUNT, i + 1))}>next ▶</button>
            </div>
            {/* bottom: **16** -> **safe-bottom + 80px**, reason: on iPhone Safari next ▶ sat under the floating URL bar and couldn't be tapped, mechanism: lifted clear of the bar (about 64px tall) plus the home-indicator inset (--safe-bottom, globals.css) */}
        </div>
    )
}
// island traversal without login: the same buttons /Game shows as links,
// but switching in place. key={island} remounts GameScene so the new
// bg color and spawn take effect (it reads them once at mount); islands
// without a map file get an empty field
