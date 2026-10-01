// DEV
'use client'

import { useRouter } from "next/navigation"
import QuestIsland from "@/components/Game/Scene/questIsland"

export default function QuestOriginal() {
    const router = useRouter()
    return (
        <div style={{ width: '100%', height: '100lvh' }}>
            <QuestIsland onLeave={() => router.push('/')} />
        </div>
    )
}
// dev route for the original quest, opened from the home form (src/app/form.tsx).
// The island is height 100% of its parent, so the wrapper gives it the full
// screen height (100lvh, like Game/page.tsx); kana is left out, so the target
// is あ. Elena's はい runs onLeave, which goes back to the home form
