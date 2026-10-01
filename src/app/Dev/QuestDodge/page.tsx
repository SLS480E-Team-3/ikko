// DEV
'use client'

import { useRouter } from "next/navigation"
import { DodgeQuestIsland } from "@/components/Game/Scene/dodgeQuestIsland"

export default function QuestDodge() {
    const router = useRouter()
    return (
        <div style={{ width: '100%', height: '100lvh' }}>
            <DodgeQuestIsland onLeave={() => router.push('/')} />
        </div>
    )
}
// dev route for the dodging quest, opened from the home form (src/app/form.tsx).
// The island is height 100% of its parent, so the wrapper gives it the full
// screen height (100lvh, like Game/page.tsx); kana is left out, so the target
// is あ. Elena's はい runs onLeave, which goes back to the home form
