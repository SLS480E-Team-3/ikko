import { NextResponse } from 'next/server'
import { adminClient, serverClient } from '@/utils/supabase'

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const name = String(body?.name ?? '').trim()
    const username = String(body?.username ?? '').trim()
    const email = String(body?.email ?? '').trim()
    const password = String(body?.password ?? '')
    // .catch(() => null) turns a non-JSON body into "all fields missing"
    // instead of a 500. Password isn't trimmed: spaces can be part of it

    if (!name || !username || !email || !password) {
        return NextResponse.json({ error: 'name, username, email and password are all required' }, { status: 400 })
    }
    if (username.includes('@')) {
        return NextResponse.json({ error: "username can't contain @" }, { status: 400 })
    }
    // same rules as the profiles check constraints (USERS_SQL), checked here
    // first so the user gets a readable message instead of Supabase's
    // generic "Database error saving new user"

    const { data: taken } = await adminClient()
        .from('profiles').select('id').eq('username', username).maybeSingle()
    if (taken) {
        return NextResponse.json({ error: 'username already taken' }, { status: 409 })
    }
    // admin client because RLS only lets signed-in users read profiles and
    // this visitor isn't signed in yet. The unique constraint still catches
    // a race where two people grab the same username at once

    const supabase = await serverClient()
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, name } },
    })
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (data.user?.identities?.length === 0) {
        return NextResponse.json({ error: 'email already registered' }, { status: 409 })
    }
    // options.data becomes raw_user_meta_data, which SIGNUP_TRIGGER_SQL
    // copies into profiles. With email confirmation on, Supabase answers a
    // taken email with a fake user whose identities array is empty (no
    // error), so that's how a duplicate email is detected. error.message
    // covers things like the minimum password length

    return NextResponse.json({ ok: true, needsConfirm: !data.session })
    // no session = email confirmation is on (the project default): the user
    // must click the link in their inbox before they can log in
}
