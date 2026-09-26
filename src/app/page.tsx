import { redirect } from "next/navigation"
import { serverClient } from "@/utils/supabase"
import { homeIsland } from "@/utils/islands"

export default async function Page() {
    const supabase = await serverClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/LogIn')
    redirect(`/Game/${await homeIsland(supabase, user.id)}`)
} // page: **client page rendering the dev nav** -> **server redirect to the player's island**, reason: '/' is the app's front door (page-relations.md), mechanism: the proxy already sends logged-out visitors to /LogIn (the check here is a fallback), a session goes to last_island_id or the first island; the dev nav moved to /Dev
