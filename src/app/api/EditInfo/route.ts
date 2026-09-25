import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase'

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const LOGGED_OUT = () => fail('log in first', 401)

const AUTH_ERRORS: Record<string, [string, number]> = {
    weak_password: ['password is too weak (at least 6 characters)', 400],
    same_password: ['new password must be different from your current one', 400],
    email_address_invalid: ['that email address is not valid', 400],
    email_exists: ['an account with that email already exists', 409],
    over_email_send_rate_limit: ['too many emails sent, wait a minute and try again', 429],
    over_request_rate_limit: ['too many attempts, wait a minute and try again', 429],
    reauthentication_needed: ['log in again before changing your password', 401],
    session_not_found: ['your session expired, log in again', 401],
}
// Supabase AuthError.code -> readable message + status for updateUser.
// Unknown codes fall through to Supabase's own message below

export async function GET() {
    try {
        const supabase = await serverClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return LOGGED_OUT()

        const { data, error } = await supabase
            .from('profiles').select('name, username').eq('id', user.id).maybeSingle()
        if (error || !data) return fail('server error, try again', 500)

        return NextResponse.json({ name: data.name, username: data.username, email: user.email ?? '' })
    } catch {
        return fail('could not reach the server, try again', 503)
    }
    // pre-fills the form. getUser (not getSession) asks Supabase to verify
    // the cookie's token, so a forged cookie can't pass. The user's own
    // client is enough: USERS_RLS_SQL lets signed-in users read profiles.
    // Email lives in auth.users, not profiles, so it comes from user
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const name = String(body?.name ?? '').trim()
    const username = String(body?.username ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const password = String(body?.password ?? '')
    // password may be blank = keep the current one. Not trimmed: spaces can
    // be part of it

    if (!name || !username || !email) {
        return fail('name, username and email are required', 400)
    }
    if (username.includes('@')) {
        return fail("username can't contain @", 400)
    }
    // same rules as the profiles check constraints (USERS_SQL), checked here
    // first for a readable message

    try {
        const supabase = await serverClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return LOGGED_OUT()

        const { data: taken, error: lookupError } = await supabase
            .from('profiles').select('id').eq('username', username).neq('id', user.id).maybeSingle()
        if (lookupError) return fail('server error, try again', 500)
        if (taken) return fail('that username already exists', 409)
        // checked before any write so a taken username doesn't leave the
        // email/password half-changed. neq skips the user's own row, so
        // keeping the same username isn't reported as taken

        const changes: { email?: string, password?: string } = {}
        if (email !== user.email) changes.email = email
        if (password) changes.password = password
        if (Object.keys(changes).length) {
            const { error } = await supabase.auth.updateUser(changes)
            if (error) {
                const [message, status] = AUTH_ERRORS[error.code ?? ''] ?? [error.message, error.status ?? 400]
                return fail(message, status)
            }
        }
        // only send what actually changed: an unchanged email would still
        // trigger a confirmation email, and an empty password means "keep".
        // A new email isn't applied until the user clicks the link Supabase
        // sends to it (email confirmation is on)

        const { error: updateError } = await supabase
            .from('profiles').update({ name, username }).eq('id', user.id)
        if (updateError) {
            if (updateError.code === '23505') return fail('that username already exists', 409)
            if (updateError.code === '23514') return fail("name can't be blank and username can't contain @", 400)
            return fail('server error, try again', 500)
        }
        // RLS "users update own profile" is what actually limits this to the
        // user's row; eq(id) just targets it. 23505 = unique violation (the
        // username was taken between the check and now), 23514 = check
        // constraint

        return NextResponse.json({ ok: true, emailPending: 'email' in changes })
    } catch {
        return fail('could not reach the server, try again', 503)
    }
    // supabase-js returns most failures as { error }, but a network failure
    // between this server and Supabase can throw; 503 = temporary, retry
}
