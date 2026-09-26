'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Button from "@/components/CustomTags/button"

export default function QuestComplete({ quest, points }: { quest: number, points: number }) {
    const router = useRouter()
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState('')

    async function complete() {
        setBusy(true)
        setMsg('')
        try {
            const res = await fetch('/api/Quest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quest }),
                signal: AbortSignal.timeout(10_000),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) return router.replace(`/Game/${json.island}`)
            setMsg(json.error ?? `something went wrong (${res.status}), try again`)
        } catch {
            setMsg('no connection, check your internet and try again')
        } finally {
            setBusy(false)
        }
    }
    // same fetch pattern as the auth pages. On success the server has saved
    // the clear and the points, and the player goes back to the island;
    // replace so Back doesn't reopen a quest that's already done

    return (
        <>
            <Button size={24} action={complete} disabled={busy}>{busy ? '...' : `COMPLETE (+${points})`}</Button>
            {msg && <div style={{ color: 'red', fontSize: '0.75rem' }}>{msg}</div>}
        </>
    )
    // placeholder "I finished" button until quests have real content; later
    // the quest's own logic calls complete() when the player passes it
}
