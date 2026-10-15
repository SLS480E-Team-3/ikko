// DEV
'use client'

import { ComponentType } from "react"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import type { ScreenType } from "../screenTypes"

type ScreenProps = { island: number, sensitivity?: number, onLeave: () => void }

const SCREENS: Record<ScreenType, ComponentType<ScreenProps>> = {
    GameScene: dynamic(() => import("@/components/Game/Scene/islandPreview").then(m => {
        const C = m.default
        return ({ island, sensitivity }: ScreenProps) => <C start={island} sensitivity={sensitivity} />
    }), { ssr: false }),
    QuestOriginal: dynamic(() => import("@/components/Game/Scene/questIsland").then(m => {
        const C = m.default
        return ({ sensitivity, onLeave }: ScreenProps) => <C sensitivity={sensitivity} onLeave={onLeave} />
    }), { ssr: false }),
    QuestShoot: dynamic(() => import("@/components/Game/Scene/shootQuestIsland").then(m => {
        const C = m.ShootQuestIsland
        return ({ sensitivity, onLeave }: ScreenProps) => <C sensitivity={sensitivity} onLeave={onLeave} />
    }), { ssr: false }),
    QuestDodge: dynamic(() => import("@/components/Game/Scene/dodgeQuestIsland").then(m => {
        const C = m.DodgeQuestIsland
        return ({ sensitivity, onLeave }: ScreenProps) => <C sensitivity={sensitivity} onLeave={onLeave} />
    }), { ssr: false }),
    QuestDoor: dynamic(() => import("@/components/Game/Scene/leftRightQuestIsland").then(m => {
        const C = m.LeftRightQuestIsland
        return ({ sensitivity, onLeave }: ScreenProps) => <C sensitivity={sensitivity} onLeave={onLeave} />
    }), { ssr: false }),
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
        <div style={{ width: '100%', height: '100lvh' }}>
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
// to the /MobDev list. The 100lvh wrapper gives the scene the full screen
// height, like the old /Dev/Quest* pages and Game/page.tsx
