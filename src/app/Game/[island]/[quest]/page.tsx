import { notFound, redirect } from "next/navigation"
import QuestScene, { type QuestSceneProps } from "@/components/Game/Scene/QuestScene"
import { adminClient, serverClient } from "@/utils/supabase"

export default async function QuestPage({ // name: **QuestScene** -> **QuestPage**, mechanism: frees the name for the imported QuestScene component this page now renders
    params,
}: {
    params: Promise<{ island: string, quest: string }>
}) {
    const { island, quest } = await params
    const islandId = Number(island)
    const questId = Number(quest)
    if (!Number.isInteger(islandId) || !Number.isInteger(questId)) notFound()

    const supabase = await serverClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/LogIn')

    const { data: row } = await supabase.from('quests')
        .select('id, island_id, title, reward_points').eq('id', questId).maybeSingle()
    if (!row) notFound()
    if (row.island_id !== islandId) redirect(`/Game/${row.island_id}/${row.id}`)
    // loads this one quest only -- the reason quests get their own route.
    // A quest opened under the wrong island (edited URL) is sent to its
    // real address, which then runs the lock check below for that island

    const { data: progress } = await supabase.from('user_islands')
        .select('unlocked_at').eq('user_id', user.id).eq('island_id', islandId).maybeSingle()
    if (!progress?.unlocked_at) redirect(`/Game/${islandId}`)
    // a quest on a locked island can't be started; the island page then
    // redirects on to the player's own island

    await adminClient().from('user_quests').upsert(
        { user_id: user.id, quest_id: questId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,quest_id' },
    )
    const { data: mine } = await supabase.from('user_quests')
        .select('completed_at').eq('quest_id', questId).maybeSingle()
    // start and resume are the same write: the first visit inserts the row
    // (started_at defaults to now()), later visits only bump updated_at, so
    // started_at and completed_at are kept. Admin client because
    // user_quests has no write policies; the read goes back through RLS

    const props: QuestSceneProps = { islandId, quest: row, cleared: !!mine?.completed_at }
    return <QuestScene {...props} /> // render: **inline JSX** -> **<QuestScene>**, mechanism: the page keeps the guards and the start/resume write; QuestScene ('use client') gets the quest and cleared flag as plain props and draws them
}
