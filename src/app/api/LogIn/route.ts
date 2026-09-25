import { NextResponse } from 'next/server'
import { adminClient, serverClient } from '@/utils/supabase'

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const INVALID = () => fail('wrong username/email or password', 401)
// one message for "no such user" and "wrong password", so the form can't be
// used to find out which usernames exist

const AUTH_ERRORS: Record<string, [string, number]> = {
    email_not_confirmed: ['confirm your email first (check your inbox)', 403],
    over_request_rate_limit: ['too many attempts, wait a minute and try again', 429],
    user_banned: ['this account has been disabled', 403],
}
// Supabase AuthError.code -> readable message + status. Supabase only
// reports these after the password matched (or, for the rate limit, for
// everyone), so none of them reveal whether a username exists

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const identifier = String(body?.identifier ?? '').trim()
    const password = String(body?.password ?? '')

    if (!identifier || !password) {
        return fail('enter your username or email, and password', 400)
    }

    try {
        let email = identifier
        if (!identifier.includes('@')) {
            const { data, error } = await adminClient().rpc('email_for_username', { p_username: identifier })
            if (error) return fail('server error, try again', 500)
            if (!data) return INVALID()
            email = data
        }
        // '@' = email (usernames can't contain one), otherwise look up the
        // username's email. The rpc needs the admin client: LOGIN_LOOKUP_SQL
        // only grants execute to service_role. A failed rpc is reported as a
        // server error, not "wrong password", so a DB outage isn't mistaken
        // for a typo. The email never leaves the server

        const supabase = await serverClient()
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            const known = AUTH_ERRORS[error.code ?? '']
            if (known) return fail(...known)
            if ((error.status ?? 0) >= 500) return fail('server error, try again', 500)
            return INVALID()
        }
        // invalid_credentials and any other 4xx collapse into INVALID; 5xx
        // means Supabase itself failed, so ask for a retry instead. On
        // success serverClient's setAll has written the session cookies
        // onto this response

        return NextResponse.json({ ok: true })
    } catch {
        return fail('could not reach the server, try again', 503)
    }
    // supabase-js returns most failures as { error }, but a network failure
    // between this server and Supabase can throw; 503 = temporary, retry
}
