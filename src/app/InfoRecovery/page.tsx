'use client'

import { FormEvent, useEffect, useState } from "react"

const LINK_ERRORS: Record<string, string> = {
    link: 'that link is expired or was opened in a different browser, send a new one',
    server: 'could not reach the server, try again',
}
// ?error= values the /api/InfoRecovery GET redirects back with

export default function InfoRecovery() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('error')
        if (code) setMsg(LINK_ERRORS[code] ?? 'something went wrong, try again')
    }, [])
    // read in an effect instead of useSearchParams, which would need a
    // Suspense boundary to prerender; window only exists after mount

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fields = Object.fromEntries(new FormData(e.currentTarget))
        setBusy(true)
        setMsg('')
        try {
            const res = await fetch('/api/InfoRecovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields),
                signal: AbortSignal.timeout(10_000),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) setMsg('if that email has an account, we sent a link. open it in this browser to see your username and set a new password')
            else setMsg(json.error ?? `something went wrong (${res.status}), try again`)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'TimeoutError') setMsg('request timed out, try again')
            else setMsg('no connection, check your internet and try again')
        } finally {
            setBusy(false)
        }
    }
    // same pattern as SignUpPage/LogInPage: 10s timeout, no-connection
    // fallback, status-code fallback for non-JSON replies. The success text
    // is the same whether or not the email exists (see the route)

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%' }}>
            RECOVERY
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}> {/* onSubmit: **{ }** -> **{handleSubmit}**, reason: empty braces were a syntax error, mechanism: form submit now posts the email to /api/InfoRecovery */}
                <input name="email" type="email" placeholder="email" autoCapitalize="none" required /> {/* spacing: **type="email"placeholder** -> **type="email" placeholder**, reason: attributes need whitespace between them, mechanism: JSX parses them as two props */}
                <button disabled={busy}>{busy ? '...' : 'SEND LINK'}</button> {/* button: **empty** -> **SEND LINK**, reason: button had no label, mechanism: disabled + '...' while the request runs, like SignUp */}
            </form>
            {msg && <div>{msg}</div>}
        </div>
    )
}
