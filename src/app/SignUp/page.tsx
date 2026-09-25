'use client'

import { FormEvent, useRef, useState } from "react" // imports: **no useRef** -> **+ useRef**, reason: Button submits the form through a ref, mechanism: see formRef
import Button from "@/components/CustomTags/button"
import Input from "@/components/CustomTags/input"

export default function SignUpPage() {
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(false)
    const fail = (text: string) => { setMsg(text); setError(true) }
    // an error message also turns every underline red (Input's `error`);
    // success messages go through setMsg alone and clear it
    const formRef = useRef<HTMLFormElement>(null)
    const submit = () => formRef.current?.requestSubmit()
    // the themed Button is a div, not a <button>, so it can't submit the form
    // by itself. requestSubmit does what a submit button would: runs the
    // required checks, then fires onSubmit -> handleSubmit. Input's Enter
    // calls the same thing, since a form with no submit button ignores Enter

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
        // browser no longer checks the address; this is the same rough check:
        // something@something.something, no spaces
        // checked before any request, so a mismatch never reaches the server.
        // password-check is split off with rest destructuring so only the
        // fields /api/SignUp expects are sent

        setBusy(true)
        setMsg('')
        setError(false)
        try {
            const res = await fetch('/api/SignUp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fields),
                signal: AbortSignal.timeout(10_000),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) setMsg(json.needsConfirm ? 'check your email to confirm your account' : 'signed up!')
            else fail(json.error ?? `something went wrong (${res.status}), try again`)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'TimeoutError') fail('request timed out, try again')
            else fail('no connection, check your internet and try again')
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: '100%', boxSizing: 'border-box' }}> {/* style: **content-box** -> **border-box**, reason: on a phone the page was 32px wider than the screen and the underlines ran off the right edge, mechanism: width 100% now includes the 16px padding on each side instead of adding to it */}
            SIGNUP
            <form ref={formRef} onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 8 }}> {/* ref: **none** -> **formRef**, reason: submit() needs the form, mechanism: requestSubmit on it */} {/* validation: **browser popup** -> **noValidate**, reason: errors should show as text under the button, not as a popup, mechanism: requestSubmit skips the native check and handleSubmit runs checkValidity itself */}
                <Input name="name" placeholder="name" onSubmit={submit} required error={error} /> {/* tag: **<input>** -> **<Input>**, reason: match the game theme, mechanism: Input hands name/type/required to its hidden <input>, so FormData and the required check work as before (same for the 4 below) */}
                <Input name="username" placeholder="username" autoCapitalize="none" onSubmit={submit} required error={error} />
                <Input name="email" inputMode="email" autoCapitalize="none" placeholder="email" onSubmit={submit} required error={error} /> {/* type: **email** -> **inputMode email**, reason: Input can't take type email, mechanism: inputMode still opens the email keyboard; the address check moved to handleSubmit */}
                <Input name="password" type="password" placeholder="password" onSubmit={submit} required error={error} />
                <Input name="password-check" type="password" placeholder="confirm password" onSubmit={submit} required error={error} />

                <Button size={24} action={submit} disabled={busy}>{busy ? '...' : 'CONFIRM'}</Button> {/* tag: **<button>** -> **<Button>**, reason: match the game theme, mechanism: action calls submit(), disabled blocks it while busy */}
                {msg && <div style={{ color: error ? 'red' : undefined, fontSize: '0.75rem' }}>{msg}</div>} {/* place: **below the form** -> **right under the button**, reason: errors should read under the button, mechanism: last child of the form's column; red only for errors */} {/* size: **inherited** -> **0.75rem**, reason: the message was as big as the inputs, mechanism: fontSize on the message div only */}
            </form>
        </div>
    )
    // type="password" masks input, type="email" gets the email keyboard on
    // phones and blocks obviously malformed addresses; required blocks
    // empty submits before handleSubmit runs. autoCapitalize="none" on
    // username so phones don't turn "shuton" into "Shuton"
}
