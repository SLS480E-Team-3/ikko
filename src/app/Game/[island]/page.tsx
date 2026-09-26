import { notFound, redirect } from "next/navigation"
import IslandScene, { type IslandSceneProps } from "@/components/Game/Scene/IslandScene"
import { adminClient, serverClient } from "@/utils/supabase"
import { firstIsland, homeIsland } from "@/utils/islands"

export default async function GameLevel({
    params,
}: {
    params: Promise<{ island: string }>
}) {
    const { island } = await params
    const islandId = Number(island)
    if (!Number.isInteger(islandId)) notFound()
    // /Game/abc -> 404 instead of a query with NaN

    const supabase = await serverClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/LogIn')
    // the proxy already sent logged-out visitors to /LogIn; this also
    // narrows `user` for TypeScript

    const first = await firstIsland(supabase)
    if (islandId === first) {
        await adminClient().from('user_islands').upsert(
            { user_id: user.id, island_id: first, unlocked_at: new Date().toISOString() },
            { onConflict: 'user_id,island_id', ignoreDuplicates: true },
        )
    }
    // the first island is always open. SIGNUP_TRIGGER_SQL unlocks it for new
    // accounts; this covers accounts made before that trigger change.
    // ignoreDuplicates = insert only, so an existing row's points are left
    // alone. Admin client because user_islands has no write policies

    const { data: progress } = await supabase.from('user_islands')
        .select('current_points, unlocked_at').eq('user_id', user.id).eq('island_id', islandId).maybeSingle()
    if (!progress?.unlocked_at) {
        const home = await homeIsland(supabase, user.id)
        const dest = home === islandId ? first : home
        if (dest === islandId) throw new Error(`island ${islandId} has no unlocked user_islands row -- is the islands table seeded?`) // guard: **always redirect** -> **throw when the target is this same page**, mechanism: with an empty islands table firstIsland falls back to 1, the upsert above fails its foreign key, so /Game/1 read itself as locked and redirected to /Game/1 forever (ERR_TOO_MANY_REDIRECTS, the stuck "Rendering"); now it stops on Next's error page with the cause
        redirect(`/Game/${dest}`)
    }
    // locked (or no such island) -> back to the player's last island. If
    // the locked one IS their last island (it can't normally be, since
    // last_island_id is only written below, after this check), go to the
    // first island instead so the redirect can't loop

    await supabase.from('profiles').update({ last_island_id: islandId }).eq('id', user.id)
    // remembered for LogIn and '/', through the "users update own profile"
    // RLS policy

    const { data: quests } = await supabase.from('quests')
        .select('id, title').eq('island_id', islandId).order('id')
    const { data: mine } = await supabase.from('user_quests')
        .select('quest_id, completed_at').in('quest_id', (quests ?? []).map(q => q.id))
    const status = new Map((mine ?? []).map(q => [q.quest_id, q.completed_at ? 'done' : 'resume']))
    // only this island's quest ids and titles, so the page stays small
    // however many quests exist; each quest's content loads on its own page.
    // user_quests RLS returns only this player's rows: a row with
    // completed_at = cleared, a row without = started and paused (resume)

    const props: IslandSceneProps = {
        islandId,
        points: progress.current_points,
        quests: (quests ?? []).map(q => ({ ...q, status: status.get(q.id) as 'done' | 'resume' | undefined })),
    }
    return <IslandScene {...props} /> // render: **inline JSX** -> **<IslandScene>**, mechanism: the page stays a server component that only loads data; IslandScene ('use client') gets it as plain props and draws the scene and quest list
}
