'use client'

import { FormEvent, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Input from "@/components/CustomTags/input"
import Button from "@/components/CustomTags/button"

export default function LogInPage() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)
    const submit = () => formRef.current?.requestSubmit()
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%', boxSizing: 'border-box' }}> {/* style: **content-box** -> **border-box**, reason: on a phone the page was 32px wider than the screen and the underlines ran off the right edge, mechanism: width 100% now includes the 16px padding on each side instead of adding to it */}
            LOGIN
            <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}> {/* ref: **none** -> **formRef**, reason: submit() did nothing (formRef.current was null), mechanism: requestSubmit on the form runs the required checks then handleSubmit */}
                <Input name="identifier" placeholder="username or email" onSubmit={submit} autoCapitalize="none" required />
                <Input name="password" type="password" placeholder="password" onSubmit={submit} required />

                <Button size={24} action={submit} disabled={busy}>{busy ? '...' : 'LOG IN'}</Button> {/* action: **none** -> **submit**, reason: the themed Button is a div, so a tap never submitted the form, mechanism: action calls requestSubmit through formRef, disabled blocks it while busy */}
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
