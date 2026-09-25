import { NextResponse } from 'next/server'
import { serverClient } from '@/utils/supabase'

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

const AUTH_ERRORS: Record<string, [string, number]> = {
    email_address_invalid: ['that email address is not valid', 400],
    validation_failed: ['that email address is not valid', 400],
    over_email_send_rate_limit: ['too many emails sent, wait a minute and try again', 429],
    over_request_rate_limit: ['too many attempts, wait a minute and try again', 429],
}
// Supabase AuthError.code -> readable message + status. None of these depend
// on whether the email has an account, so they're safe to show as-is

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const email = String(body?.email ?? '').trim()

    if (!email) return fail('enter your email', 400)
    if (!email.includes('@')) return fail('that email address is not valid', 400)

    try {
        const supabase = await serverClient()
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${new URL(req.url).origin}/api/InfoRecovery`,
            // TODO: add this URL in Supabase Dashboard > Authentication >
            // URL Configuration > Redirect URLs, or the reset link won't work:
            //   http://localhost:3000/**        (dev)
            //   https://<production-domain>/**  (after deploying to Vercel)
            // Without it Supabase sends the link to the Site URL instead, and
            // the user lands there not logged in
        })
        if (error) {
            const known = AUTH_ERRORS[error.code ?? '']
            if (known) return fail(...known)
            return fail('server error, try again', 500)
        }
        // Supabase emails a one-time link only if the account exists, but
        // answers the same either way, so this route can't be used to check
        // which emails are registered. serverClient uses the PKCE flow: it
        // stores a code verifier cookie on this browser, and the link comes
        // back to GET below with ?code=. redirectTo must be listed under
        // Auth > URL Configuration > Redirect URLs in the Supabase dashboard,
        // otherwise Supabase falls back to the Site URL

        return NextResponse.json({ ok: true })
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

    if (!code) return back('/InfoRecovery?error=link')

    try {
        const supabase = await serverClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) return back('/InfoRecovery?error=link')
        return back('/EditInfo?recovered=1')
    } catch {
        return back('/InfoRecovery?error=server')
    }
    // the reset email's link lands here. exchangeCodeForSession swaps the
    // one-time code (plus the verifier cookie set by POST) for a session,
    // and setAll writes it as cookies, so the user arrives at EditInfo
    // logged in: they see their username there and can set a new password.
    // An expired/used link, or one opened in a different browser (no
    // verifier cookie), fails the exchange and goes back with ?error=link
}
