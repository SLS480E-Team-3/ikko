'use client'

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

export default function LogInPage() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fields = Object.fromEntries(new FormData(e.currentTarget))
        setBusy(true)
        setMsg('')
        try {
            const res = await fetch('/api/LogIn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields),
                signal: AbortSignal.timeout(10_000),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) setMsg('logged in!')
            else setMsg(json.error ?? `something went wrong (${res.status}), try again`)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'TimeoutError') setMsg('request timed out, try again')
            else setMsg('no connection, check your internet and try again')
        } finally {
            setBusy(false)
        }
    }
    // same pattern as SignUpPage: AbortSignal.timeout cancels after 10s
    // (TimeoutError), any other rejection = no response at all, and a
    // non-JSON reply falls back to the status code. finally re-enables the
    // button on every path. On success the route has already set the
    // session cookies, so later requests are logged in

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%' }}>
            LOGIN
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input name="identifier" placeholder="username or email" autoCapitalize="none" required />
                <input name="password" type="password" placeholder="password" required />

                <button disabled={busy}>{busy ? '...' : 'LOG IN'}</button>
            </form>
            <div
                style={{
                    color: 'red',
                    fontSize: '0.5rem',
                }}
                onClick={() => router.push('./InfoRecovery')}><u>forgot username or password?</u>
            </div>
            {msg && <div>{msg}</div>}
        </div>
    )
    // one field takes either a username or an email; the route tells them
    // apart by '@'. autoCapitalize="none" stops phone keyboards turning
    // "shuton" into "Shuton", which wouldn't match
}
