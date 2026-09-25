import { NextResponse } from 'next/server'
import { adminClient, serverClient } from '@/utils/supabase'

const INVALID = () => NextResponse.json({ error: 'wrong username/email or password' }, { status: 401 })
// one message for "no such user" and "wrong password", so the form can't be
// used to find out which usernames exist

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const identifier = String(body?.identifier ?? '').trim()
    const password = String(body?.password ?? '')

    if (!identifier || !password) {
        return NextResponse.json({ error: 'enter your username or email, and password' }, { status: 400 })
    }

    let email = identifier
    if (!identifier.includes('@')) {
        const { data } = await adminClient().rpc('email_for_username', { p_username: identifier })
        if (!data) return INVALID()
        email = data
    }
    // '@' = email (usernames can't contain one), otherwise look up the
    // username's email. The rpc needs the admin client: LOGIN_LOOKUP_SQL only
    // grants execute to service_role. The email never leaves the server

    const supabase = await serverClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error?.code === 'email_not_confirmed') {
        return NextResponse.json({ error: 'confirm your email first (check your inbox)' }, { status: 403 })
    }
    if (error) return INVALID()
    // Supabase only reports email_not_confirmed after the password matched,
    // so showing it doesn't leak anything. On success serverClient's setAll
    // has written the session cookies onto this response

    return NextResponse.json({ ok: true })
}
