// DEV
'use client'

import MobileView from "@/components/MobileView"
import {
    IPHONE17_SCREEN,
    IPHONE17_PRO_SCREEN,
    IPHONE17_MAX_SCREEN,
    IPHONE16_SCREEN,
    IPHONE16_PRO_SCREEN,
    IPHONE16_MAX_SCREEN,
    IPHONE15_SCREEN,
    IPHONE15_PRO_SCREEN,
    IPHONE15_MAX_SCREEN,
    IPHONE13_MINI_SCREEN,
    IPHONE13_SCREEN,
    IPHONE13_PRO_SCREEN,
    IPHONE13_MAX_SCREEN,
    IPHONE_SE_3RD_GEN_SCREEN,
    IPHONE_SE_2ND_GEN_SCREEN,
    GALAXY_S26_SCREEN,
    GALAXY_S26_ULTRA_SCREEN,
    PIXEL_10_SCREEN,
    PIXEL_10_PRO_SCREEN,
    XIAOMI_15_PRO_SCREEN,
} from "@/utils/mobileScreenSIze"
import { CSSProperties, ReactNode, useEffect, useState, useSyncExternalStore } from "react" // imports: **+ useSyncExternalStore** -> **+ useEffect**, mechanism: IslandPreview starts the island BGM // imports: **useState** -> **+ useSyncExternalStore**, mechanism: see mounted
import { ISLAND_BGM, playBgm } from "@/components/Game/Entity/voice" // imports: **none** -> **ISLAND_BGM, playBgm**, mechanism: same track table and player as IslandScene
import GameScene, { BG_W, BG_H, SceneNPC, objectHitBoxes, SENSITIVITY_DEF, ISLAND_COUNT, islandBg } from "@/components/Game/Scene/gameScene" // imports: **+ QUEST_BG** -> **removed**, mechanism: the quest island is QuestIsland now, which sizes its own bg // imports: **default only** -> **+ BG_W, BG_H, SceneNPC, objectHitBoxes, SENSITIVITY_DEF**, mechanism: places the test NPCs around the player spawn (world center), clear of the map's object hitBoxes; SENSITIVITY_DEF seeds the sensitivity input (moved here with the MobileGameScene merge)
import SignUpPage from "@/app/SignUp/page"
import LogInPage from "@/app/LogIn/page"
import InfoRecovery from "@/app/InfoRecovery/page"
import EditInfo from "@/app/EditInfo/page"
import { ISLAND_MAPS } from "@/components/Game/islands"
import { BUBBLE_BG } from "@/components/Game/Entity/dialogBubble"
import NPCRenderer from "@/components/Game/Entity/npcRenderer"
import { ISLAND_1_NPC, npcsForRow } from "@/components/Game/npcs/npcs" // imports: **ISLAND_1_NPC** -> **+ npcsForRow**, mechanism: the preview moves the NPCs to the chosen kana row // imports: **+ QUEST_ISLAND_NPC** -> **ISLAND_1_NPC**, mechanism: QuestIsland builds its own NPCs from the training phase
import QuestIsland from "@/components/Game/Scene/questIsland"
import { ShootQuestIsland } from "@/components/Game/Scene/shootQuestIsland" // imports: **none** -> **ShootQuestIsland**, mechanism: the quest island copy with shooting, for its own tab
import { DodgeQuestIsland } from "@/components/Game/Scene/dodgeQuestIsland" // imports: **none** -> **DodgeQuestIsland**, mechanism: the square dodging-quest island, for its own tab
import { ISLAND_NPCS } from "@/components/Game/npcs" // imports: **none** -> **ISLAND_NPCS**, mechanism: seeded per-island NPC spots for IslandPreview // imports: **none** -> **ISLAND_1_NPC**, mechanism: see the game scene page
import EntityRenderer, { ENT_H } from "@/components/Game/Entity/entityRenderer"
import { KANA_ROWS } from "@/components/Game/kana"
// imports: **none** -> **KANA_ROWS**, mechanism: bounds and labels for the row buttons

const PHONES: { label: string; screen: CSSProperties }[] = [
    { label: 'IPHONE17', screen: IPHONE17_SCREEN },
    { label: 'IPHONE17_PRO', screen: IPHONE17_PRO_SCREEN },
    { label: 'IPHONE17_MAX', screen: IPHONE17_MAX_SCREEN },
    { label: 'IPHONE16', screen: IPHONE16_SCREEN },
    { label: 'IPHONE16_PRO', screen: IPHONE16_PRO_SCREEN },
    { label: 'IPHONE16_MAX', screen: IPHONE16_MAX_SCREEN },
    { label: 'IPHONE15', screen: IPHONE15_SCREEN },
    { label: 'IPHONE15_PRO', screen: IPHONE15_PRO_SCREEN },
    { label: 'IPHONE15_MAX', screen: IPHONE15_MAX_SCREEN },
    { label: 'IPHONE13_MINI', screen: IPHONE13_MINI_SCREEN },
    { label: 'IPHONE13', screen: IPHONE13_SCREEN },
    { label: 'IPHONE13_PRO', screen: IPHONE13_PRO_SCREEN },
    { label: 'IPHONE13_MAX', screen: IPHONE13_MAX_SCREEN },
    { label: 'IPHONE_SE_3RD_GEN', screen: IPHONE_SE_3RD_GEN_SCREEN },
    { label: 'IPHONE_SE_2ND_GEN', screen: IPHONE_SE_2ND_GEN_SCREEN },
    { label: 'GALAXY_S26', screen: GALAXY_S26_SCREEN },
    { label: 'GALAXY_S26_ULTRA', screen: GALAXY_S26_ULTRA_SCREEN },
    { label: 'PIXEL_10', screen: PIXEL_10_SCREEN },
    { label: 'PIXEL_10_PRO', screen: PIXEL_10_PRO_SCREEN },
    { label: 'XIAOMI_15_PRO', screen: XIAOMI_15_PRO_SCREEN },
]

const PAGES: { label: string; page: (sensitivity: number) => ReactNode }[] = [ // type: **page: ReactNode** -> **page: (sensitivity) => ReactNode**, reason: the sensitivity input must reach GameScene, mechanism: a prebuilt element is frozen with its props, so each page is built at render time from the current input
    { label: 'game scene', page: (s) => <IslandPreview sensitivity={s} /> }, // page: **<GameScene island 1>** -> **<IslandPreview>**, mechanism: same scene wrapped with prev/next island buttons // npcs: **TEST_NPCS** -> **ISLAND_1_NPC**, reason: test the real island 1 NPCs without logging in to /Game, mechanism: the same list IslandScene passes for island 1
    { label: 'quest island', page: (s) => <QuestIsland sensitivity={s} onLeave={() => alert('back to island')} /> }, // page: **<GameScene QUEST_BG>** -> **<QuestIsland>**, mechanism: the 2x-screen bordered island with Ryuuko's training; Elena's はい on the fail screen runs onLeave
    { label: 'quest shoot', page: (s) => <ShootQuestIsland sensitivity={s} onLeave={() => alert('back to island')} /> }, // pages: **no quest shoot** -> **quest shoot tab**, mechanism: same quest island, but Space / a tap (or a second finger while the stick is held) fires red 5x8 bullets during a level
    { label: 'quest dodge', page: (s) => <DodgeQuestIsland sensitivity={s} onLeave={() => alert('back to island')} /> }, // tabs: **no quest dodge** -> **quest dodge tab**, mechanism: a square island (screen height x screen height) with Ryuuko at the center, no wall, blocks flying in from all 4 edges
    // the 1000 x 700 Quest Island without logging in; Kaeru's はい alerts
    // instead of routing back
    { label: 'sign up', page: () => <SignUpPage /> },
    { label: 'log in', page: () => <LogInPage /> },
    { label: 'recovery', page: () => <InfoRecovery /> },
    { label: 'edit info', page: () => <EditInfo /> },
    { label: 'dialog bubble', page: () => <BubblePreview /> },
]
// both scenes are GameScene, which has the touch joystick built in; drag
// with the mouse anywhere on the phone to test it on a laptop. mobile game
// scene = the map alone, game scene = the map + test NPCs

const NPC_NAMES = ['Gon', 'Killua', 'Kurapika', 'Ren', 'Shuto', 'Genki', 'Leorio', 'Kaito']
const randomNames = (n: number) => [...NPC_NAMES].sort(() => Math.random() - 0.5).slice(0, n)
// n different names picked at random from the pool: shuffle a copy, take the
// first n. Runs once when the module loads, so names change per page load
// but stay put while the scene re-renders every frame

const names = randomNames(4)
const NPC_COLORS = ['gray', 'steelblue', 'plum', 'khaki']
const NPC_MIN_DIST = 20
const NPC_MAX_DIST = 120
const apart = (a: { dx: number, dy: number }, b: { dx: number, dy: number }) =>
    Math.abs(a.dx - b.dx) >= 12 + 4 || Math.abs(a.dy - b.dy) >= ENT_H + 4
// two 12 x ENT_H bodies (centers dx/dy) don't touch when they're a full body
// width apart on x or height apart on y; + 4 leaves a small gap to walk into
const MAP_BOXES = objectHitBoxes(ISLAND_MAPS[1])
const clearOfObjects = (n: { dx: number, dy: number }) => MAP_BOXES.every(b => {
    const x = BG_W / 2 + n.dx, y = BG_H / 2 + n.dy
    return x + 6 + 4 <= b.x || x - 6 - 4 >= b.x + b.w || y + ENT_H / 2 + 4 <= b.y || y - ENT_H / 2 - 4 >= b.y + b.h
})
// the NPC body (12 x ENT_H, centered on the spot in world px) plus the same
// 4 px gap lies fully left, right, above or below each object hitBox of the
// map the scene draws (ISLAND_MAPS[1])
const npcSpots: { dx: number, dy: number }[] = []
while (npcSpots.length < NPC_COLORS.length) {
    const dist = NPC_MIN_DIST + Math.random() * (NPC_MAX_DIST - NPC_MIN_DIST)
    const angle = Math.random() * Math.PI * 2
    const spot = { dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist) }
    if (apart(spot, { dx: 0, dy: 0 }) && npcSpots.every(o => apart(spot, o)) && clearOfObjects(spot)) npcSpots.push(spot) // accept: **clear of player + NPCs** -> **+ clearOfObjects**, mechanism: a spot inside an object hitBox is retried like one overlapping the player
}
// random spot per NPC: a random angle and a center distance of 20..120 px from
// the player spawn. A spot is retried if its body would overlap the player's
// spawn body (the origin) or an NPC already placed, so nobody starts stuck
// inside someone else. Module-level, so it runs once per page load
const TEST_NPCS: SceneNPC[] = npcSpots.map((n, i) => ({ // spots: **fixed ±60 / -40,+50 box** -> **random npcSpots 20..120 px away**, mechanism: see npcSpots
    ent: { name: names[i], // name: **`NPC ${i + 1}`** -> **names[i]**, mechanism: random name from NPC_NAMES, no repeats
         x: BG_W / 2 + n.dx, y: BG_H / 2 + n.dy, w: 12, h: ENT_H, color: NPC_COLORS[i], facing: 'none' },
    dialog: i % 2 === 0 ? [{ condition: 'default', jp: ['おい', '頼みがあるんだが', '聞いてくれるか？'], en: [] }] : undefined, // dialog: **greeting + string[]** -> **Dialog[]**, mechanism: no greeting entry = GREETING_DEF; every other NPC has no dialog, so tapping it just repeats the greeting (pickDialog fallback) and zooms back out
}))
// four entities at random spots near the player spawn (world center);
// module-level so the array is the same every render. Bubbles can overlap
// now that they're close, but only NPCs near the player show one

function IslandPreview({ sensitivity }: { sensitivity: number }) {
    const [island, setIsland] = useState(1)
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

function BubblePreview() {
    const spots = [
        { x: 25, y: 70, text: 'はい (hai) = yes', name: 'Sensei' },
        { x: 25, y: 185, text: 'こんにちは (konnichiwa) = hello! はじめまして (hajimemashite) = nice to meet you' },
    ]
    return (
        <div style={{ position: 'relative', width: 130, height: 265, transform: 'scale(3)', transformOrigin: 'top left' }}> {/* height: **205** -> **265**, mechanism: room for the translated NPC below */}
            {spots.map((s) => (
                <EntityRenderer key={s.text} velocity={{ x: 0, y: 0 }} ent={{ name: s.name, x: s.x, y: s.y, w: 12, h: ENT_H, color: 'gray', facing: 'none' }} dialog={s.text} /> // preview: **EntityRenderer + DialogBubble side by side** -> **EntityRenderer dialog prop**, mechanism: the bubble is wired inside EntityRenderer now, so the preview goes through the same path the game will
            ))}
            <NPCRenderer npc={{ ...ISLAND_1_NPC[0], ent: { ...ISLAND_1_NPC[0].ent, x: 25, y: 245 } }} index={0} velocity={{ x: 0, y: 0 }} inRange selected line={0} />
            {/* translated NPC: Hana's first talk line with its English
                typing underneath, through NPCRenderer like the game */}
        </div>
    )
}
// dialog bubble preview: two standing entities at 3x (world px are tiny on
// a phone), one short and one long text, to check the square border, the
// tail tip above the entity, the shadow and the wrap at maxWidth; the
// first one has a name so the tag can be checked against the bubble

export default function MobileTester() {

    const [phone, setPhone] = useState<CSSProperties>(PHONES[0].screen)
    const [page, setPage] = useState<(sensitivity: number) => ReactNode>(() => PAGES[0].page) // state: **the element** -> **its builder**, reason: see PAGES, mechanism: the useState initializer and setPage(() => fn) wrap it because React would call a bare function as an updater
    const [sensitivity, setSensitivity] = useState<number>(SENSITIVITY_DEF)
    const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
    // false on the server and during hydration, true after. The test NPCs
    // (names + spots) come from Math.random at module load, which runs once on
    // the server and again in the browser with different results, so the
    // pages are only rendered client-side. An empty subscribe = never changes

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex'
        }}>
            <div style={{
                justifyContent: 'left',
            }}>
                <select
                    style={{
                        height: 50,
                        fontSize: 32
                    }}
                    onChange={(e) => {
                        const selected = PHONES.find((p) => p.label === e.target.value)
                        if (selected) setPhone(selected.screen)
                    }}
                >
                    {
                        PHONES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)
                    }
                </select>
            </div>
            <div style={{
                justifyContent: 'left',
            }}>
                <select
                    style={{
                        height: 50,
                        fontSize: 32
                    }}
                    onChange={(e) => {
                        const selected = PAGES.find((p) => p.label === e.target.value)
                        if (selected) setPage(() => selected.page)
                    }}
                >
                    {
                        PAGES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)
                    }
                </select>
            </div>
            <label style={{ fontSize: 24, height: 50, display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
                sensitivity
                <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    style={{ width: 80, height: 40, fontSize: 24 }}
                />
            </label>
            {/* joystick sensitivity for 'mobile game scene': full push =
            50px / sensitivity of drag. A number input with 0.1 steps; an
            empty box becomes 0, which GameScene floors at 0.1 */}
            <div style={{
                flex: 1,
                display: 'flex',
                overflow: 'auto'
            }}>
                <MobileView size={phone} page={mounted ? page(sensitivity) : null} /> {/* page: **always page(sensitivity)** -> **null until mounted**, reason: hydration error on the NPC name tag, mechanism: the server rendered its own random NPCs, the browser different ones; now the server sends an empty phone and the browser draws the page after hydrating, so there is nothing to compare */}
            </div>
        </div>
    )
}