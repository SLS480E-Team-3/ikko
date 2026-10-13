// DEV
'use client'

import { useRouter } from "next/navigation"
import { LeftRightQuestIsland } from "@/components/Game/Scene/leftRightQuestIsland"

export default function QuestDoor() {
    const router = useRouter()
    return (
        <div style={{ width: '100%', height: '100lvh' }}>
            <LeftRightQuestIsland onLeave={() => router.push('/Dev?Island=1')} />
        </div>
    )
}
// dev route for the Left or Right door quest, opened from the home form
// (src/app/form.tsx). Same wrapper as Dev/QuestDodge: the island is height
// 100% of its parent, so the wrapper gives it the full screen height (100lvh,
// like Game/page.tsx). Elena's はい runs onLeave, which goes back home
