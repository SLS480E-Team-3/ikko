import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function serverClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll: () => cookieStore.getAll(),
                setAll: (list: { name: string, value: string, options: CookieOptions }[]) => {
                    try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
                }, // setAll: **always set** -> **set, ignore the throw**, reason: island/quest pages now call serverClient from Server Components, which can't set cookies, mechanism: a token refresh there throws on cookieStore.set; it's safe to drop because src/proxy.ts already refreshed the session before the page rendered
            },
        },
    )
}
// acts as the signed-in user (publishable key + RLS). signUp /
// signInWithPassword write the session into cookies through setAll, so the
// browser stays logged in on later requests. cookies() is async in
// Next 15+, hence the await. Only callable from route handlers / Server
// Actions -- a Server Component can read cookies but not set them.
// setAll's param is typed by hand: @supabase/ssr 0.5 overloads the cookies
// option (old get/set/remove vs getAll/setAll), so TS can't infer it

export function adminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    )
}
// secret key = service_role, bypasses RLS. Server-only: never import this
// file from a 'use client' component (SUPABASE_SECRET_KEY has no
// NEXT_PUBLIC_ prefix, so Next wouldn't bundle it anyway, it would just be
// undefined). Used for username lookups that anon/authenticated can't do
