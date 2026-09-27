# Enable Auth

Supabase auth settings that were turned off for development. Turn them back on before real players sign up.

Supabase → project **ftzoaconpaiottoozwtd** → Authentication

## Before you start: custom SMTP

Set this up **first**. Without it, turning "Confirm email" back on breaks sign-up.

The built-in email sender:
- only delivers to your Supabase team members' addresses, so real players never get the confirmation link;
- allows only a few emails per hour, which gives `over_email_send_rate_limit` → "too many signups right now, try again later".

**Emails → SMTP Settings**
- [ ] Turn on **Enable custom SMTP** and fill in a provider such as Resend, with the host, port, user, password and sender address.
- [ ] Save.

**Rate Limits**
- [ ] Raise **Rate limit for sending emails** to fit the expected number of sign-ups per hour. The field only unlocks after custom SMTP is saved.

## Sign In / Providers → User Signups

- [ ] Turn **Confirm email** on (disabled for dev on 2026-09-25).
- [ ] Click **Save changes**.

What changes in the app:
- `/api/SignUp` POST returns `needsConfirm: true` with no session, and the SignUp page shows "check your email".
- The link in the email lands on `/api/SignUp` GET, which exchanges the code for a session and redirects to the first island.

## URL Configuration → Redirect URLs

The confirmation link only works if its target is allowed here.

- [ ] Production: `https://<production-domain>/**`. Add `https://ikko.vercel.app/**` if that is the production domain.
- [ ] Previews: `https://ikko-*-shutos-projects-a2cbcccd.vercel.app/**` (already added).
- [ ] Set the **Site URL** to the production domain. Supabase falls back to it whenever a redirect doesn't match.
- [ ] Keep or remove `http://localhost:3000/**` as the team prefers. It only matters for local testing with confirmation on.

## Check it worked

Run this from the project root. It uses the public key in `.env`:

```bash
set -a; . ./.env; set +a; curl -s "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/settings" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
```

Expected values:
- `"disable_signup": false`: sign-ups are allowed.
- `"external": { "email": true, ... }`: the Email provider is on.
- `"mailer_autoconfirm": false`: Confirm email is **on**. During dev this is `true`.

Then sign up with a real address you can open, click the link, and check that you land on the first island logged in.
