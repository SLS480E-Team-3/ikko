import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PRIVATE = ['/Game', '/EditInfo']
const GUEST_ONLY = ['/LogIn', '/SignUp']
const under = (path: string, roots: string[]) => roots.some(r => path === r || path.startsWith(`${r}/`))
// PRIVATE needs a session, GUEST_ONLY makes no sense with one. `under`
// matches the root and everything below it (/Game/3/42), but not a
// look-alike such as /GameOver

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request })
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (list: { name: string, value: string, options: CookieOptions }[]) => {
                    list.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
                },
            },
        },
    )
    // the Supabase SSR proxy pattern: when getUser() refreshes an expired
    // token, setAll writes the new cookies twice -- onto the request, so
    // the page rendering after this sees them, and onto the response, so
    // the browser keeps them. Server components can't set cookies, so this
    // is the one place a session gets refreshed on a page load

    const { data: { user } } = await supabase.auth.getUser()
    const path = request.nextUrl.pathname
    // getUser() asks Supabase to verify the token (getSession() only
    // decodes the cookie, which a user could forge), so a guard can trust it

    const to = (dest: string) => {
        const redirect = NextResponse.redirect(new URL(dest, request.url))
        response.cookies.getAll().forEach(c => redirect.cookies.set(c))
        return redirect
    }
    // a redirect is a new response, so the refreshed cookies are copied
    // onto it; otherwise the browser would keep the stale token

    if (!user && (path === '/' || under(path, PRIVATE))) return to('/LogIn')
    if (user && under(path, GUEST_ONLY)) return to('/')
    return response
    // logged in on /LogIn or /SignUp -> '/', which reads last_island_id and
    // forwards to that island (src/app/page.tsx). '/' logged out -> LogIn,
    // which links to SignUp for new players
}

export const config = {
    matcher: ['/', '/Game/:path*', '/EditInfo', '/LogIn', '/SignUp'],
}
// only these pages run the proxy: /api routes check the session
// themselves, and static files, /InfoRecovery, /MobileTester and /Dev don't
// need one. Next 16 renamed middleware.ts to proxy.ts (same API, see
// node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md)
