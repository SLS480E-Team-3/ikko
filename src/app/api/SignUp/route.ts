import { NextResponse } from 'next/server'
import { adminClient, serverClient } from '@/utils/supabase'
import { firstIsland } from '@/utils/islands'

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

const AUTH_ERRORS: Record<string, [string, number]> = {
    weak_password: ['password is too weak (at least 6 characters)', 400],
    email_address_invalid: ['that email address is not valid', 400],
    email_exists: ['an account with that email already exists', 409],
    user_already_exists: ['an account with that email already exists', 409],
    over_email_send_rate_limit: ['too many signups right now, try again later', 429], // message: **wait a minute and try again** -> **try again later**, mechanism: Supabase's email limit resets hourly, not per minute, so the message no longer promises a one-minute wait
    over_request_rate_limit: ['too many attempts, wait a minute and try again', 429],
    signup_disabled: ['signups are turned off right now', 403],
    email_provider_disabled: ['signups are turned off right now', 403], // map: **Supabase's raw "Email signups are disabled"** -> **same message as signup_disabled**, mechanism: the code Supabase returns when the Email provider is switched off now has its own entry instead of falling through
    unexpected_failure: ['could not create your account, that username may have just been taken', 409],
}
// Supabase AuthError.code -> readable message + status. unexpected_failure
// is what signUp returns when SIGNUP_TRIGGER_SQL raises (blank field or a
// username grabbed between our check and the insert). Unknown codes fall
// through to Supabase's own message below

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const name = String(body?.name ?? '').trim()
    const username = String(body?.username ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const password = String(body?.password ?? '')
    // .catch(() => null) turns a non-JSON body into "all fields missing"
    // instead of a 500. Password isn't trimmed: spaces can be part of it

    if (!name || !username || !email || !password) {
        return fail('name, username, email and password are all required', 400)
    }
    if (username.includes('@')) {
        return fail("username can't contain @", 400)
    }
    // same rules as the profiles check constraints (USERS_SQL), checked here
    // first so the user gets a readable message instead of Supabase's
    // generic "Database error saving new user"

    try {
        const { data: taken, error: lookupError } = await adminClient()
            .from('profiles').select('id').eq('username', username).maybeSingle()
        if (lookupError) return fail('server error, try again', 500)
        if (taken) return fail('that username already exists', 409)
        // admin client because RLS only lets signed-in users read profiles
        // and this visitor isn't signed in yet. A failed lookup stops here
        // rather than being read as "username is free"

        const supabase = await serverClient()
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username, name }, emailRedirectTo: `${new URL(req.url).origin}/api/SignUp` }, // options: **data only** -> **+ emailRedirectTo**, reason: the confirmation link should land on island 1, mechanism: Supabase sends the link back to GET below with ?code= (the URL must be in Supabase > Auth > URL Configuration > Redirect URLs, same as /api/InfoRecovery)
        })
        if (error) {
            const [message, status] = AUTH_ERRORS[error.code ?? ''] ?? [error.message, error.status ?? 400]
            return fail(message, status)
        }
        if (data.user?.identities?.length === 0) {
            return fail('an account with that email already exists', 409)
        }
        // options.data becomes raw_user_meta_data, which SIGNUP_TRIGGER_SQL
        // copies into profiles. With email confirmation on, Supabase answers
        // a taken email with a fake user whose identities array is empty
        // (no error), so that's how a duplicate email is detected

        return NextResponse.json({ ok: true, needsConfirm: !data.session, island: data.session ? await firstIsland(supabase) : null }) // body: **+ island**, reason: with a session the page goes straight to the first island, mechanism: the new client is signed in, so it can read islands; null while the email is unconfirmed
        // no session = email confirmation is on (the project default): the
        // user must click the link in their inbox before they can log in
    } catch {
        return fail('could not reach the server, try again', 503)
    }
    // supabase-js returns most failures as { error }, but a network failure
    // between this server and Supabase can throw; 503 = temporary, retry
}

export async function GET(req: Request) {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const back = (path: string) => NextResponse.redirect(new URL(path, url.origin))

    if (!code) return back('/LogIn')

    try {
        const supabase = await serverClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) return back('/LogIn')
        return back(`/Game/${await firstIsland(supabase)}`)
    } catch {
        return back('/LogIn')
    }
    // the confirmation email's link (emailRedirectTo above) lands here, same
    // pattern as /api/InfoRecovery GET: exchangeCodeForSession swaps the
    // one-time code plus the PKCE verifier cookie for a session, and the new
    // player arrives on the first island logged in. The account is already
    // confirmed by the time the link reaches here, so a failed exchange
    // (expired link, opened in another browser without the verifier cookie)
    // sends them to LogIn, where their password still works
}
