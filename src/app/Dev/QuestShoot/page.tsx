// DEV
'use client'

import { useRouter } from "next/navigation"
import { ShootQuestIsland } from "@/components/Game/Scene/shootQuestIsland"

export default function QuestShoot() {
    const router = useRouter()
    return (
        <div style={{ width: '100%', height: '100lvh' }}>
            <ShootQuestIsland onLeave={() => router.push('/')} />
        </div>
    )
}
// dev route for the shooting quest, opened from the home form (src/app/form.tsx).
// The island is height 100% of its parent, so the wrapper gives it the full
// screen height (100lvh, like Game/page.tsx); kana is left out, so the target
// is あ. Elena's はい runs onLeave, which goes back to the home form
