'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import type { NPCProps } from "../Entity/npcRenderer"
import type { Condition, Dialog } from "../Entity/dialogBubble"
import { toDialogs, toNPCProps, type NpcScript } from "../npcs/toNPCProps"
import hirokoScript from "../npcs/dialogs/hiroko_en.json"
// Hiroko's quest tutorials (docs/quest-tutorials.spec.json): she stands next
// to Ryuuko before a run and explains the quest type in English

export type QuestType = 'original' | 'dodge' | 'shoot' | 'door'
export type TutorialProps = { seen: boolean, onSeen: () => void }
// seen: the player was already asked about this quest type (Supabase,
// user_tutorials); onSeen: called once when they answer. No props at all =
// no account (the /Dev pages, MobileTester), so she asks every time

export const HIROKO = 1
export const HIROKO_DX = 56
const PHONE_MAX_W = 768
// Hiroko's npc index: she is only out in 'intro', where Ryuuko is 0 and
// Elena isn't out, so 1 never clashes with ELENA. She stands HIROKO_DX world
// px right of Ryuuko (fits the 184 px door hall: 56 + 12 < 92). A screen
// under PHONE_MAX_W css px wide gets the touch lines, wider gets the keys

const DIALOGS = toDialogs(hirokoScript as NpcScript)
const entry = (condition: Condition): Dialog => DIALOGS.find(d => d.condition === condition) ?? { condition, jp: [], en: [] }
// her entries from hiroko_en.json, read once. A missing entry is an empty
// Dialog, so a typo shows the bubble's '...' instead of crashing

type TutState = 'ask' | 'teach' | 'bye'
// ask: the first-time question (はい / いいえ); teach: the tutorial for this
// quest type and device; bye: only the hand-off line, after いいえ

export function useTutorial(type: QuestType, active: boolean, props?: TutorialProps) {
    const [state, setState] = useState<TutState>(props?.seen ? 'teach' : 'ask')
    const [talkRequest, setTalkRequest] = useState<{ npc: number, key: number }>()
    const talk = useCallback(() => setTalkRequest(r => ({ npc: HIROKO, key: (r?.key ?? 0) + 1 })), [])
    const activeRef = useRef(active)
    activeRef.current = active
    const propsRef = useRef(props)
    propsRef.current = props
    const told = useRef(false)

    useEffect(() => { if (!propsRef.current?.seen) talk() }, [talk])
    // auto talk: on mount, unless this quest type was already asked about,
    // her question opens by itself (GameScene's talkRequest)

    const hiroko = (x: number, y: number): NPCProps => {
        const ask = entry('tut-ask')
        const device = typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_W ? 'touch' : 'keys'
        const greeting: Dialog = { condition: 'greeting', jp: ask.jp, en: ask.en, audio: ask.audio }
        const talkEntry: Dialog = state === 'ask'
            ? { ...ask, condition: 'quest' }
            : { ...entry(state === 'bye' ? 'tut-bye' : `tut-${type}-${device}`), condition: 'default' }
        return toNPCProps(hirokoScript as NpcScript, x, y, [greeting, talkEntry])
    }
    // her NPCProps at (x, y): in range she asks her question (greeting); the
    // talk is the question with choices ('quest', so GameScene sends the pick
    // to onChoice), or the tutorial / hand-off line ('default'). The device is
    // read each render, so turning a tablet or resizing a window switches
    // between the touch and keys lines

    const onChoice = useCallback((npc: number, choice: number): boolean => {
        if (!activeRef.current || npc !== HIROKO) return false
        if (!told.current) { told.current = true; propsRef.current?.onSeen() }
        setState(choice === 0 ? 'teach' : 'bye')
        talk()
        return true
    }, [talk])
    // true = the choice was Hiroko's and is handled here, so the island skips
    // the training's onChoice (which would read npc 1 as Elena and leave).
    // はい opens the tutorial, いいえ only the hand-off line; either answer
    // marks the quest type as seen (once per mount)

    const onTalkEnd = useCallback((npc: number): boolean => {
        if (!activeRef.current || npc !== HIROKO) return false
        setState(s => s === 'bye' ? 'teach' : s)
        return true
    }, [])
    // after the hand-off line a tap on her plays the tutorial, like a later
    // visit; true = handled, same as onChoice

    return { hiroko, onChoice, onTalkEnd, talkRequest }
}
// usage in a quest island (phase === 'intro' is `active`):
//   const tut = useTutorial('dodge', t.phase === 'intro', tutorial)
//   npcs: t.phase === 'intro' ? [...npcs, tut.hiroko(npcs[0].ent.x + HIROKO_DX, npcs[0].ent.y)] : npcs
//   onChoice={(n, c) => tut.onChoice(n, c) || t.onChoice(n, c)}
//   onTalkEnd={n => tut.onTalkEnd(n) || t.onTalkEnd(n)}
//   talkRequest={useMergedTalk(t.talkRequest, tut.talkRequest)}

export function useMergedTalk(...reqs: ({ npc: number, key: number } | undefined)[]) {
    const last = useRef<{ keys: (number | undefined)[], out?: { npc: number, key: number } }>({ keys: [] })
    const keys = reqs.map(r => r?.key)
    const changed = keys.findIndex((k, i) => k !== undefined && k !== last.current.keys[i])
    if (changed !== -1) last.current = { keys, out: { npc: reqs[changed]!.npc, key: (last.current.out?.key ?? 0) + 1 } }
    return last.current.out
}
// GameScene takes one talkRequest; this passes on whichever request's key
// changed last (the training's or Hiroko's), under its own key that always
// goes up, so GameScene opens the talk once per new request. The ref is
// written during render on purpose: a re-render with the same keys (or
// StrictMode's second render) finds nothing changed and returns the same object
