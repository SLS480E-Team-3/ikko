import { NextResponse } from 'next/server'
import { adminClient, serverClient } from '@/utils/supabase'

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function POST(req: Request) {
    const body = await req.json().catch(() => null)
    const questId = Number(body?.quest)
    if (!Number.isInteger(questId)) return fail('which quest?', 400)

    try {
        const { data: { user } } = await (await serverClient()).auth.getUser()
        if (!user) return fail('log in first', 401)
        const admin = adminClient()
        // the session proves who's asking; every write after it uses the
        // admin client, since user_islands / user_quests have no write
        // policies -- only this route can hand out points

        const { data: quest } = await admin.from('quests')
            .select('island_id, reward_points').eq('id', questId).maybeSingle()
        if (!quest) return fail('no such quest', 404)
        const island = quest.island_id

        const { data: cleared, error } = await admin.from('user_quests')
            .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
            .eq('user_id', user.id).eq('quest_id', questId).is('completed_at', null)
            .select('quest_id')
        if (error) return fail('server error, try again', 500)
        if (!cleared?.length) return NextResponse.json({ ok: true, island, unlocked: null })
        // only a started, not-yet-cleared row matches, and the update and
        // that check are one statement: a double tap or a second tab finds
        // nothing to update and gets no second reward. No row at all (quest
        // never opened) is treated the same way

        const { data: progress } = await admin.from('user_islands')
            .select('current_points').eq('user_id', user.id).eq('island_id', island).maybeSingle()
        const points = (progress?.current_points ?? 0) + quest.reward_points
        await admin.from('user_islands').update({ current_points: points })
            .eq('user_id', user.id).eq('island_id', island)
        // points are per island. Read-then-write: two different quests
        // cleared at the same instant could lose one reward; fine for now,
        // a Postgres function doing `current_points = current_points + n`
        // would close that gap

        const { data: here } = await admin.from('islands').select('sort_order').eq('id', island).single()
        const { data: next } = await admin.from('islands').select('id, threshold')
            .gt('sort_order', here?.sort_order ?? 0).order('sort_order').limit(1).maybeSingle()
        let unlocked: number | null = null
        if (next && points >= next.threshold) {
            await admin.from('user_islands').upsert(
                { user_id: user.id, island_id: next.id, unlocked_at: new Date().toISOString() },
                { onConflict: 'user_id,island_id', ignoreDuplicates: true },
            )
            unlocked = next.id
        }
        // the next island (by sort_order) opens once this island's points
        // reach its threshold. ignoreDuplicates keeps an earlier unlock (and
        // its points) untouched

        return NextResponse.json({ ok: true, island, unlocked })
        // `unlocked` isn't used by the page yet; it's there for a future
        // "new island!" message
    } catch {
        return fail('could not reach the server, try again', 503)
    }
}
