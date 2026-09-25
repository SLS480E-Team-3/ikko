'use client'

import { FormEvent, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Input from "@/components/CustomTags/input"
import Button from "@/components/CustomTags/button"

export default function LogInPage() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(false)
    const fail = (text: string) => { setMsg(text); setError(true) }
    // an error message also turns every underline red (Input's `error`);
    // success messages go through setMsg alone and clear it
    const formRef = useRef<HTMLFormElement>(null)
    const submit = () => formRef.current?.requestSubmit()
    const router = useRouter()

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!e.currentTarget.checkValidity()) return fail('fill in every field')
        // the form is noValidate, so the browser's 'fill out this field'
        // popup never shows; checkValidity still reads each `required` and
        // the message goes under the button with the rest
        const fields = Object.fromEntries(new FormData(e.currentTarget))
        setBusy(true)
        setMsg('')
        setError(false)
        try {
            const res = await fetch('/api/LogIn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields),
                signal: AbortSignal.timeout(10_000),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) setMsg('logged in!')
            else fail(json.error ?? `something went wrong (${res.status}), try again`)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'TimeoutError') fail('request timed out, try again')
            else fail('no connection, check your internet and try again')
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
            <form ref={formRef} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 8 }}> {/* ref: **none** -> **formRef**, reason: submit() did nothing (formRef.current was null), mechanism: requestSubmit on the form runs the required checks then handleSubmit */} {/* validation: **browser popup** -> **noValidate**, reason: errors should show as text under the button, not as a popup, mechanism: requestSubmit skips the native check and handleSubmit runs checkValidity itself */}
                <Input name="identifier" placeholder="username or email" onSubmit={submit} autoCapitalize="none" required error={error} />
                <Input name="password" type="password" placeholder="password" onSubmit={submit} required error={error} />

                <Button size={24} action={submit} disabled={busy}>{busy ? '...' : 'LOG IN'}</Button> {/* action: **none** -> **submit**, reason: the themed Button is a div, so a tap never submitted the form, mechanism: action calls requestSubmit through formRef, disabled blocks it while busy */}
                {msg && <div style={{ color: error ? 'red' : undefined, fontSize: '0.75rem' }}>{msg}</div>} {/* place: **below the form** -> **right under the button**, reason: errors should read under the button, mechanism: last child of the form's column; red only for errors */} {/* size: **inherited** -> **0.75rem**, reason: the message was as big as the inputs, mechanism: fontSize on the message div only */}
            </form>
            {error && <div
                style={{
                    color: 'red',
                    fontSize: '0.5rem',
                }}
                onClick={() => router.push('./InfoRecovery')}><u>forgot username or password?</u>
            </div>} {/* show: **always** -> **after an error**, reason: the recovery link is only needed once a login fails, mechanism: rendered only while `error` is true; cleared again when the next request starts */}
        </div>
    )
    // one field takes either a username or an email; the route tells them
    // apart by '@'. autoCapitalize="none" stops phone keyboards turning
    // "shuton" into "Shuton", which wouldn't match
}
