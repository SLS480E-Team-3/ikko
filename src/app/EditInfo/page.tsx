'use client'

import { FormEvent, useEffect, useState } from "react"

type Info = { name: string, username: string, email: string }

async function request(init?: RequestInit) {
    try {
        const res = await fetch('/api/EditInfo', { ...init, signal: AbortSignal.timeout(10_000) })
        const json = await res.json().catch(() => ({}))
        return { res, json, error: res.ok ? '' : (json.error ?? `something went wrong (${res.status}), try again`) }
    } catch (err) {
        if (err instanceof DOMException && err.name === 'TimeoutError') return { error: 'request timed out, try again' }
        return { error: 'no connection, check your internet and try again' }
    }
}
// the SignUp/LogIn fetch pattern (10s timeout, no-connection message,
// status-code fallback for non-JSON replies) pulled into one helper since
// this page calls the route twice: GET to pre-fill, POST to save

export default function EditInfo() {
    const [info, setInfo] = useState<Info | null>(null)
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        const recovered = new URLSearchParams(window.location.search).has('recovered')
        request().then(({ json, error }) => {
            if (error) return setMsg(error)
            setInfo(json)
            if (recovered) setMsg("you're logged in, set a new password below")
        })
    }, [])
    // loads the current values so the user edits them instead of retyping.
    // ?recovered=1 is added by the reset-link redirect in /api/InfoRecovery.
    // Not logged in -> the route's 401 "log in first" shows and no form

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const { 'password-check': passwordCheck, ...fields } = Object.fromEntries(new FormData(e.currentTarget))
        if (fields.password !== passwordCheck) {
            setMsg('passwords do not match')
            return
        }
        // same client-side check as SignUpPage; two blanks match, which means
        // "keep the current password"

        setBusy(true)
        setMsg('')
        const { json, error } = await request({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        })
        setBusy(false)
        if (error) return setMsg(error)
        setMsg(json.emailPending ? 'saved! confirm the new email from the link sent to it' : 'saved!')
    }
    // request() never throws, so busy is always reset without try/finally

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%' }}>
            EDIT INFO {/* title: **RECOVERY** -> **EDIT INFO**, reason: copied from the recovery stub, mechanism: plain text label */}
            {info && (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}> {/* onSubmit: **{ }** -> **{handleSubmit}**, reason: empty braces were a syntax error, mechanism: form submit now posts to /api/EditInfo; form waits for info so defaultValue has data */}
                    <input name="name" placeholder="name" defaultValue={info.name} required /> {/* defaultValue: **none** -> **info.name**, reason: pre-fill current value, mechanism: uncontrolled input, FormData still reads it */}
                    <input name="username" placeholder="username" autoCapitalize="none" defaultValue={info.username} required /> {/* defaultValue: **none** -> **info.username**, reason: shows the username to someone who forgot it, mechanism: same as name */}
                    <input name="email" type="email" placeholder="email" defaultValue={info.email} required /> {/* defaultValue: **none** -> **info.email**, reason: pre-fill, mechanism: route only calls updateUser if it changed */}
                    <input name="password" type="password" placeholder="new password (blank = keep)" autoComplete="new-password" /> {/* required: **required** -> **optional**, reason: editing a name shouldn't force a password change, mechanism: route skips the password when blank */}
                    <input name="password-check" type="password" placeholder="confirm new password" autoComplete="new-password" /> {/* required: **required** -> **optional**, reason: matches password, mechanism: two blanks pass the match check */}

                    <button disabled={busy}>{busy ? '...' : 'SAVE'}</button>
                </form>
            )}
            {msg && <div>{msg}</div>}
        </div>
    )
}
