'use client'

import { FormEvent, useState } from "react"

export default function LogInPage() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fields = Object.fromEntries(new FormData(e.currentTarget))
        setBusy(true)
        const res = await fetch('/api/LogIn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        })
        const json = await res.json()
        setMsg(res.ok ? 'logged in!' : json.error)
        setBusy(false)
    }
    // same fetch pattern as SignUpPage. On success the route has already set
    // the session cookies, so later requests are logged in

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%' }}>
            LOGIN
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input name="identifier" placeholder="username or email" autoCapitalize="none" required />
                <input name="password" type="password" placeholder="password" required />

                <button disabled={busy}>{busy ? '...' : 'LOG IN'}</button>
            </form>
            {msg && <div>{msg}</div>}
        </div>
    )
    // one field takes either a username or an email; the route tells them
    // apart by '@'. autoCapitalize="none" stops phone keyboards turning
    // "shuton" into "Shuton", which wouldn't match
}
