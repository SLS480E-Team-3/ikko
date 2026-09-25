'use client'

import { FormEvent, useState } from "react"

export default function SignUpPage() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const { 'password-check': passwordCheck, ...fields } = Object.fromEntries(new FormData(e.currentTarget))
        if (fields.password !== passwordCheck) {
            setMsg('passwords do not match')
            return
        }
        // checked before any request, so a mismatch never reaches the server.
        // password-check is split off with rest destructuring so only the
        // fields /api/SignUp expects are sent

        setBusy(true)
        setMsg('')
        try {
            const res = await fetch('/api/SignUp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields),
                signal: AbortSignal.timeout(10_000),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) setMsg(json.needsConfirm ? 'check your email to confirm your account' : 'signed up!')
            else setMsg(json.error ?? `something went wrong (${res.status}), try again`)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'TimeoutError') setMsg('request timed out, try again')
            else setMsg('no connection, check your internet and try again')
        } finally {
            setBusy(false)
        }
    }
    // AbortSignal.timeout cancels the fetch after 10s and rejects with a
    // TimeoutError; any other rejection means the request never got a
    // response (offline, server down). .catch(() => ({})) covers a non-JSON
    // reply (e.g. a crash page), falling back to the status code. finally
    // re-enables the button on every path. FormData is read before the
    // first await because e.currentTarget is null once the handler yields

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%' }}>
            SIGNUP
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input name="name" placeholder="name" required />
                <input name="username" placeholder="username" autoCapitalize="none" required />
                <input name="email" type="email" placeholder="email" required />
                <input name="password" type="password" placeholder="password" required />
                <input name="password-check" type="password" placeholder="confirm password" required />

                <button disabled={busy}>{busy ? '...' : 'CONFIRM'}</button>
            </form>
            {msg && <div>{msg}</div>}
        </div>
    )
    // type="password" masks input, type="email" gets the email keyboard on
    // phones and blocks obviously malformed addresses; required blocks
    // empty submits before handleSubmit runs. autoCapitalize="none" on
    // username so phones don't turn "shuton" into "Shuton"
}
