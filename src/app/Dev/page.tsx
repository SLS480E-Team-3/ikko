// DEV
'use client'

import { use } from "react"
import Form from "../form"
import IslandPreview from "@/components/Game/Scene/islandPreview"

export default function DevPage({ searchParams }: { searchParams: Promise<{ Island?: string }> }) {
    const { Island } = use(searchParams)
    if (Island) return (
        <div style={{ width: '100%', height: '100lvh' }}>
            <IslandPreview start={Number(Island) || 1} />
        </div>
    )
    return <Form/>
}
// render: **always the dev nav** -> **?Island=N shows MobileTester's island
// preview full-screen**, mechanism: Next 16 passes searchParams as a promise,
// use() reads it in this client page; the 100lvh wrapper gives the preview the
// full screen height (like Game/page.tsx). Without ?Island it's the old dev
// nav: the old landing page's MobileTester / GAME / SignUp buttons, moved here
// when '/' became the redirect to the player's island. Not in the proxy
// matcher, so it opens logged in or out
