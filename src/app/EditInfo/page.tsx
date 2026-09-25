'use client'

import { FormEvent, useEffect, useRef, useState } from "react" // imports: **no useRef** -> **+ useRef**, reason: Button submits the form through a ref, mechanism: see formRef
import Button from "@/components/CustomTags/button"
import Input from "@/components/CustomTags/input"

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
    const [error, setError] = useState(false)
    const fail = (text: string) => { setMsg(text); setError(true) }
    // an error message also turns every underline red (Input's `error`);
    // success messages go through setMsg alone and clear it
    const formRef = useRef<HTMLFormElement>(null)
    const submit = () => formRef.current?.requestSubmit()
    // same as SignUpPage: the themed Button is a div, so it submits through
    // requestSubmit (required checks, then onSubmit -> handleSubmit). Input's
    // Enter calls it too, since a form with no submit button ignores Enter
    const edit = (key: keyof Info) => (v: string) => setInfo(i => i && { ...i, [key]: v })
    // Input has no defaultValue, so name/username/email are controlled by
    // info itself: edit('name') returns the onChange that writes that one key.
    // The hidden <input> still carries the value, so FormData reads it as before

    useEffect(() => {
        const recovered = new URLSearchParams(window.location.search).has('recovered')
        request().then(({ json, error }) => {
            if (error) return fail(error)
            setInfo(json)
            if (recovered) setMsg("you're logged in, set a new password below")
        })
    }, [])
    // loads the current values so the user edits them instead of retyping.
    // ?recovered=1 is added by the reset-link redirect in /api/InfoRecovery.
    // Not logged in -> the route's 401 "log in first" shows and no form

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!e.currentTarget.checkValidity()) return fail('fill in every field')
        // the form is noValidate, so the browser's 'fill out this field'
        // popup never shows; checkValidity still reads each `required` and
        // the message goes under the button with the rest
        const { 'password-check': passwordCheck, ...fields } = Object.fromEntries(new FormData(e.currentTarget))
        if (fields.password !== passwordCheck) {
            fail('passwords do not match')
            return
        }
        if (!/^\S+@\S+\.\S+$/.test(String(fields.email))) {
            fail('enter a valid email')
            return
        }
        // the themed Input can't be type="email" (see input.tsx), so the
        // browser no longer checks the address; same rough check as SignUpPage.
        // password match: same client-side check as SignUpPage; two blanks match, which means
        // "keep the current password"

        setBusy(true)
        setMsg('')
        setError(false)
        const { json, error } = await request({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
        })
        setBusy(false)
        if (error) return fail(error)
        setMsg(json.emailPending ? 'saved! confirm the new email from the link sent to it' : 'saved!')
    }
    // request() never throws, so busy is always reset without try/finally

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%', boxSizing: 'border-box' }}> {/* style: **content-box** -> **border-box**, reason: on a phone the page was 32px wider than the screen and the underlines ran off the right edge, mechanism: width 100% now includes the 16px padding on each side instead of adding to it */}
            EDIT INFO {/* title: **RECOVERY** -> **EDIT INFO**, reason: copied from the recovery stub, mechanism: plain text label */}
            {info && (
                <form ref={formRef} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 8 }}> {/* ref: **none** -> **formRef**, reason: submit() needs the form, mechanism: requestSubmit on it */} {/* onSubmit: **{ }** -> **{handleSubmit}**, reason: empty braces were a syntax error, mechanism: form submit now posts to /api/EditInfo; form waits for info so the fields start pre-filled */} {/* validation: **browser popup** -> **noValidate**, reason: errors should show as text under the button, not as a popup, mechanism: requestSubmit skips the native check and handleSubmit runs checkValidity itself */}
                    <Input name="name" placeholder="name" text={info.name} onChange={edit('name')} onSubmit={submit} required error={error} /> {/* tag: **<input defaultValue>** -> **<Input text/onChange>**, reason: match the game theme; Input has no defaultValue, mechanism: controlled by info so it starts pre-filled, and the hidden <input> keeps name/required so FormData and the required check work as before (same for the 2 below) */}
                    <Input name="username" placeholder="username" autoCapitalize="none" text={info.username} onChange={edit('username')} onSubmit={submit} required error={error} />
                    <Input name="email" inputMode="email" autoCapitalize="none" placeholder="email" text={info.email} onChange={edit('email')} onSubmit={submit} required error={error} /> {/* type: **email** -> **inputMode email**, reason: Input can't take type email, mechanism: inputMode still opens the email keyboard; the address check moved to handleSubmit */}
                    <Input name="password" type="password" placeholder="new password (blank = keep)" autoComplete="new-password" onSubmit={submit} error={error} /> {/* tag: **<input autoComplete="new-password">** -> **<Input autoComplete="new-password">**, reason: match the game theme, mechanism: uncontrolled like before; Input now forwards autoComplete to its hidden <input>, so password managers still offer a new password (same for the 1 below) */}
                    <Input name="password-check" type="password" placeholder="confirm new password" autoComplete="new-password" onSubmit={submit} error={error} />

                    <Button size={24} action={submit} disabled={busy}>{busy ? '...' : 'SAVE'}</Button> {/* tag: **<button>** -> **<Button>**, reason: match the game theme, mechanism: action calls submit(), disabled blocks it while busy */}
                    {msg && <div style={{ color: error ? 'red' : undefined, fontSize: '0.75rem' }}>{msg}</div>} {/* place: **below the form** -> **right under the button**, reason: errors should read under the button, mechanism: last child of the form's column; red only for errors */} {/* size: **inherited** -> **0.75rem**, reason: the message was as big as the inputs, mechanism: fontSize on the message div only */}
                </form>
            )}
            {!info && msg && <div style={{ color: error ? 'red' : undefined, fontSize: '0.75rem' }}>{msg}</div>} {/* show: **always here** -> **only with no form**, reason: with the form up the message is under its button, mechanism: covers the load error (e.g. not logged in) where there is no form */} {/* size: **inherited** -> **0.75rem**, reason: the message was as big as the inputs, mechanism: fontSize on the message div only */}
        </div>
    )
}
