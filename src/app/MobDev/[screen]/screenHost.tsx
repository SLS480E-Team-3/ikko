// DEV
'use client'

import { ComponentType } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import type { ScreenType } from "../screenTypes"

type ScreenProps = { island: number, sensitivity?: number, onLeave: () => void }

const Tint = ({ color }: { color: string }) => <style>{`html, body { background-color: ${color}; }`}</style>
// paints the page behind the scene, like Game/layout.tsx: Safari tints its
// status-bar strip and the area under its floating URL bar with the page
// background, which was white. The <style> unmounts with the screen, so the
// /MobDev list and form screens stay white

const SCREENS: Record<ScreenType, ComponentType<ScreenProps>> = {
    GameScene: dynamic(() => import("@/components/Game/Scene/islandPreview").then(m => {
        const C = m.default
        return ({ island, sensitivity }: ScreenProps) => <C start={island} sensitivity={sensitivity} tint />
    }), { ssr: false }), // adapter: **Tint with islandBg(start island)** -> **IslandPreview tint prop**, reason: the strips kept the first island's color after prev / next, mechanism: IslandPreview tints with the island it is showing now
    QuestOriginal: dynamic(() => Promise.all([import("@/components/Game/Scene/questIsland"), import("@/components/Game/Entity/dialogBubble")]).then(([m, { BUBBLE_BG }]) => {
        const C = m.default
        return ({ sensitivity, onLeave }: ScreenProps) => <><Tint color={BUBBLE_BG} /><C sensitivity={sensitivity} onLeave={onLeave} /></>
    }), { ssr: false }), // adapter: **quest only** -> **+ Tint BUBBLE_BG**, mechanism: the quest island's cream fills the strips Safari leaves around the page
    QuestShoot: dynamic(() => Promise.all([import("@/components/Game/Scene/shootQuestIsland"), import("@/components/Game/Entity/dialogBubble")]).then(([m, { BUBBLE_BG }]) => {
        const C = m.ShootQuestIsland
        return ({ sensitivity, onLeave }: ScreenProps) => <><Tint color={BUBBLE_BG} /><C sensitivity={sensitivity} onLeave={onLeave} /></>
    }), { ssr: false }), // adapter: **quest only** -> **+ Tint BUBBLE_BG**, mechanism: the quest island's cream fills the strips Safari leaves around the page
    QuestDodge: dynamic(() => Promise.all([import("@/components/Game/Scene/dodgeQuestIsland"), import("@/components/Game/Entity/dialogBubble")]).then(([m, { BUBBLE_BG }]) => {
        const C = m.DodgeQuestIsland
        return ({ sensitivity, onLeave }: ScreenProps) => <><Tint color={BUBBLE_BG} /><C sensitivity={sensitivity} onLeave={onLeave} /></>
    }), { ssr: false }), // adapter: **quest only** -> **+ Tint BUBBLE_BG**, mechanism: the quest island's cream fills the strips Safari leaves around the page
    QuestDoor: dynamic(() => Promise.all([import("@/components/Game/Scene/leftRightQuestIsland"), import("@/components/Game/Entity/dialogBubble")]).then(([m, { BUBBLE_BG }]) => {
        const C = m.LeftRightQuestIsland
        return ({ sensitivity, onLeave }: ScreenProps) => <><Tint color={BUBBLE_BG} /><C sensitivity={sensitivity} onLeave={onLeave} /></>
    }), { ssr: false }), // adapter: **quest only** -> **+ Tint BUBBLE_BG**, mechanism: the quest island's cream fills the strips Safari leaves around the page
    QuestParticle: dynamic(() => Promise.all([import("@/components/Game/Scene/particleQuestIsland"), import("@/components/Game/Entity/dialogBubble")]).then(([m, { BUBBLE_BG }]) => {
        const C = m.ParticleQuestIsland
        return ({ sensitivity, onLeave }: ScreenProps) => <><Tint color={BUBBLE_BG} /><C sensitivity={sensitivity} onLeave={onLeave} /></>
    }), { ssr: false }),
    // same adapter as QuestDoor for island 3's particle quest; no kana is
    // passed, so it runs the mix pool (に and で sentences)
    SignUp: dynamic(() => import("@/app/SignUp/page"), { ssr: false }),
    LogIn: dynamic(() => import("@/app/LogIn/page"), { ssr: false }),
    InfoRecovery: dynamic(() => import("@/app/InfoRecovery/page"), { ssr: false }),
    EditInfo: dynamic(() => import("@/app/EditInfo/page"), { ssr: false }),
    DialogBubble: dynamic(() => import("@/components/Game/Entity/bubblePreview"), { ssr: false }),
}
// one next/dynamic per screen type: each import() is its own chunk, and a
// chunk is only fetched when its entry renders, so a phone on
// /MobDev/QuestDoor downloads the door quest and nothing else. ssr: false =
// browser-only render (random NPC spots, audio), which replaces
// MobileTester's mounted flag. The quest/island adapters map the shared
// ScreenProps onto each component's own props; form pages take none

const toNum = (v: string | null) => v === null || v === '' || isNaN(Number(v)) ? undefined : Number(v)

export default function ScreenHost({ screen }: { screen: ScreenType }) {
    const router = useRouter()
    const query = useSearchParams()
    const Screen = SCREENS[screen]
    return (
        <div style={{ position: 'fixed', inset: 0, overflow: 'auto' }}> {/* wrapper: **width 100%, height 100lvh** -> **position fixed, inset 0**, reason: lvh is taller than what Safari shows, so the bottom of the scene (island buttons) sat under the floating URL bar, mechanism: a fixed box pinned to all 4 edges is exactly the visible viewport and resizes with the bars, no vh units; overflow auto lets a form taller than the screen scroll inside it */}
            <Screen
                island={Math.trunc(toNum(query.get('island')) ?? 1)}
                sensitivity={toNum(query.get('sens'))}
                onLeave={() => router.push('/MobDev')}
            />
        </div>
    )
}
// full-screen host for one screen. ?island=N (default 1, IslandPreview clamps
// it to a real island) and ?sens=X (missing or not a number = undefined, so
// the scene uses SENSITIVITY_DEF). onLeave (Elena's はい on a quest) goes back
// to the /MobDev list. The fixed inset-0 wrapper gives the scene exactly the
// visible screen; Tint fills whatever Safari draws around it
