import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuestType } from '@/components/Game/Scene/tutorial'

export async function firstIsland(supabase: SupabaseClient): Promise<number> {
    const { data } = await supabase.from('islands').select('id').order('sort_order').limit(1).maybeSingle()
    return data?.id ?? 1
}
// the island every player starts on: lowest sort_order, the same one
// SIGNUP_TRIGGER_SQL unlocks. Falls back to 1 if the islands table is
// empty or unreadable, so a redirect always has somewhere to go

export async function homeIsland(supabase: SupabaseClient, userId: string): Promise<number> {
    const { data } = await supabase.from('profiles').select('last_island_id').eq('id', userId).maybeSingle()
    return data?.last_island_id ?? firstIsland(supabase)
}
// where a returning player lands (LogIn, the landing page, a locked-island
// redirect): the island they last opened, else the first island.
// `supabase` must be signed in as userId -- RLS lets them read profiles
// and islands

export const islandQuestType = (islandId: number): QuestType => islandId === 2 ? 'dodge' : 'original'
// which quest island an island's NPCs send the player to: island 2 runs the
// dodge quest (DodgeQuestIsland), every other island the original catch
// quest (QuestIsland). Plain module, not tutorial.ts ('use client'), so the
// server quest page can call it to read the matching user_tutorials row
