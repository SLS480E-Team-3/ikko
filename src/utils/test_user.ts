// DEV
// Seeds test accounts into Supabase. Run from the project root:
//   npx tsx --env-file=.env src/utils/test_user.ts
// Safe to re-run: accounts that already exist are skipped

import { createClient } from '@supabase/supabase-js'

type TestUser = {
    email: string,
    username: string,
    name: string,
}

const TEST_USERS: TestUser[] = [
    { email: 'shuton@example.com', username: 'shuton', name: 'shuto' },
    { email: 'genkiand0@example.com', username: 'genkia', name: 'genki' },
    { email: 'jordiy0@example.com', username: 'jordiy', name: 'jordi' },
]
// only the signup fields; email + password go to auth.users, username +
// name ride along as metadata and SIGNUP_TRIGGER_SQL copies them into
// profiles -- so this never inserts into profiles directly. ids are the
// uuids Supabase generates, not hand-picked numbers

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
const password = process.env.SEED_PASSWORD
if (!url || !secretKey || !password) {
    throw new Error('set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY and SEED_PASSWORD in .env')
}
// every value comes from the gitignored .env (loaded by --env-file), so no
// key or password is committed. All test users share SEED_PASSWORD; it
// must meet the project's minimum password length

const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
})
// the secret key (service_role) is needed for auth.admin.*; the session
// options are off because a one-shot script has no user session to keep

async function seed() {
    for (const user of TEST_USERS) {
        const { error } = await admin.auth.admin.createUser({
            email: user.email,
            password: password!,
            email_confirm: true,
            user_metadata: { username: user.username, name: user.name },
        })

        if (!error) console.log(`created ${user.username}`)
        else if (error.code === 'email_exists') console.log(`skipped ${user.username} (already exists)`)
        else console.error(`failed ${user.username}: ${error.message}`)
    }
}
seed()
// wrapped in an async function because package.json has no
// "type": "module", so tsx runs this file as CommonJS, which rejects
// top-level await. password! because TS doesn't carry the throw-guard's
// narrowing into the function body
// email_confirm: true marks the account confirmed without sending a
// confirmation email, so fake addresses work and nothing bounces.
// user_metadata lands in raw_user_meta_data, which the signup trigger
// reads. email_exists is skipped instead of failing so the script can be
// re-run; a taken/blank username makes the trigger reject the signup and
// shows up as "Database error creating new user"


// test users
// - **Team Lead / PM** Jordi Yamauchi (https://github.com/jordiyamauchi)
// - **UX/UI Designer** Sarah Wong(https://github.com/sarahw8-byte)
// - **Instructional Designer** Tiffany Horimoto(https://github.com/tshori1128)
// - **Lead Developer** Shuto Nishida (https://github.com/shuton-gif)
// - **Research & Testing Lead** Genki Ando (https://github.com/genkiand0)
