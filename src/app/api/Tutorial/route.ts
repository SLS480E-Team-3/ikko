import { NextResponse } from 'next/server'
import { adminClient, serverClient } from '@/utils/supabase'
import type { QuestType } from '@/components/Game/Scene/tutorial'

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const TYPES: QuestType[] = ['original', 'dodge', 'shoot', 'door', 'particle'] // types: **4** -> **+ 'particle'**, mechanism: island 3's quest saves its tutorial row too
// the quest types Hiroko has a tutorial for; anything else is a bad request

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const type = body?.type
    if (!TYPES.includes(type)) return fail('which tutorial?', 400)

    try {
        const { data: { user } } = await (await serverClient()).auth.getUser()
        if (!user) return fail('log in first', 401)

        const { error } = await adminClient().from('user_tutorials').upsert(
            { user_id: user.id, quest_type: type },
            { onConflict: 'user_id,quest_type', ignoreDuplicates: true },
        )
        if (error) return fail('server error, try again', 500)
        // same split as the Quest route: the session proves who's asking,
        // the admin client writes, since user_tutorials has no write
        // policies. ignoreDuplicates keeps the first seen_at on a repeat call

        return NextResponse.json({ ok: true })
    } catch {
        return fail('could not reach the server, try again', 503)
    }
}
