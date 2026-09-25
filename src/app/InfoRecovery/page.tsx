'use client'

import { FormEvent, useEffect, useRef, useState } from "react" // imports: **no useRef** -> **+ useRef**, reason: Button submits the form through a ref, mechanism: see formRef
import Button from "@/components/CustomTags/button"
import Input from "@/components/CustomTags/input"

const LINK_ERRORS: Record<string, string> = {
    link: 'that link is expired or was opened in a different browser, send a new one',
    server: 'could not reach the server, try again',
}
// ?error= values the /api/InfoRecovery GET redirects back with

export default function InfoRecovery() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)
    const submit = () => formRef.current?.requestSubmit()
    // the themed Button is a div, not a <button>, so it can't submit the form
    // by itself. requestSubmit runs the required check, then fires onSubmit ->
    // handleSubmit. Input's Enter calls the same thing, since a form with no
    // submit button ignores Enter

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('error')
        if (code) setMsg(LINK_ERRORS[code] ?? 'something went wrong, try again')
    }, [])
    // read in an effect instead of useSearchParams, which would need a
    // Suspense boundary to prerender; window only exists after mount

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const fields = Object.fromEntries(new FormData(e.currentTarget))
        if (!/^\S+@\S+\.\S+$/.test(String(fields.email))) {
            setMsg('enter a valid email')
            return
        }
        // the themed Input can't be type="email" (see input.tsx), so the
        // browser no longer checks the address; same rough check as SignUp:
        // something@something.something, no spaces, before any request

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
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}> {/* ref: **none** -> **formRef**, reason: submit() needs the form, mechanism: requestSubmit on it */}
                <Input name="email" inputMode="email" autoCapitalize="none" placeholder="email" onSubmit={submit} required /> {/* tag: **<input type="email">** -> **<Input inputMode="email">**, reason: match the game theme; Input can't take type email, mechanism: name/required go to its hidden <input> so FormData and the empty check work as before, inputMode keeps the email keyboard, the address check moved to handleSubmit */}
                <Button size={24} action={submit} disabled={busy}>{busy ? '...' : 'SEND LINK'}</Button> {/* tag: **<button>** -> **<Button>**, reason: match the game theme, mechanism: action calls submit(), disabled blocks it while busy */}
            </form>
            {msg && <div>{msg}</div>}
        </div>
    )
}
