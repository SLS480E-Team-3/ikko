'use client'

import { FormEvent, useState } from "react"

export default function SignUpPage() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fields = Object.fromEntries(new FormData(e.currentTarget))
        setBusy(true)
        const res = await fetch('/api/SignUp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        })
        const json = await res.json()
        setMsg(res.ok ? (json.needsConfirm ? 'check your email to confirm your account' : 'signed up!') : json.error)
        setBusy(false)
    }
    // preventDefault stops the browser's full-page form post; FormData is
    // read before the await because e.currentTarget is null once the
    // handler has yielded. Inputs are read by their name attribute, which
    // matches the keys /api/SignUp expects

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%' }}>
            SIGNUP
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input name="name" placeholder="name" required />
                <input name="username" placeholder="username" required />
                <input name="email" type="email" placeholder="email" required />
                <input name="password" type="password" placeholder="password" required />

                <button disabled={busy}>{busy ? '...' : 'CONFIRM'}</button>
            </form>
            {msg && <div>{msg}</div>}
        </div>
    )
    // 'user client' typo fixed to 'use client' -- without it this is a
    // Server Component and onSubmit/useState throw when /SignUp is opened
    // directly. type="password" masks it, type="email" gets the email
    // keyboard on phones; required blocks empty submits before the fetch
}
