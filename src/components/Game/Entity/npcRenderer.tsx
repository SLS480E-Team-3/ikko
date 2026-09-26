'use client'

import { QuestsProps } from "@/utils/schema"
import EntityRenderer, { EntityProps } from "./entityRenderer"
import DialogBubble, { Dialog } from "./dialogBubble"

export type NPCProps = {
    ent: EntityProps, // shape: **EntityProps & {...}** -> **{ ent, ... }**, reason: GameScene already keeps NPCs as { ent, dialog }, mechanism: the entity box stays one object, so the scene's solids / range checks read n.ent like the player's
    dialog?: Dialog[], // greeting, greetingEn, dialog, dialogEn: **four separate fields** -> **dialog: Dialog[]**, reason: an NPC says different things by condition (first talk, after talking, quest cleared), mechanism: each entry is tagged with its condition and carries its jp lines + en; pickDialog below chooses one
    quest?: { id: number, title: string, status?: 'done' | 'resume' }
}
// selected: **in NPCProps** -> **NPCRenderer prop**, reason: which NPC is
// talking is scene state, not NPC data, mechanism: GameScene passes
// selected / line per NPC each frame, so the NPC list stays static

export const GREETING_DEF: Dialog = { condition: 'greeting', jp: 'こんにちは', en: 'Hello' } // GREETING_DEF: **'こんにちは'** -> **a greeting Dialog**, mechanism: carries its English, used when an NPC has no 'greeting' entry

const toList = (s: string | string[]) => typeof s === 'string' ? [s] : s

const find = (npc: NPCProps, condition: Dialog['condition']) => npc.dialog?.find(d => d.condition === condition && toList(d.jp).length > 0)
export const greeting = (npc: NPCProps) => find(npc, 'greeting') ?? GREETING_DEF
// the entry shown above an NPC while the player is in range

export const pickDialog = (npc: NPCProps, spoken: boolean): Dialog =>
    (npc.quest?.status === 'done' ? find(npc, 'questCleared') : undefined) ??
    (spoken ? find(npc, 'spoken') : undefined) ??
    find(npc, 'default') ??
    greeting(npc)
// the entry a talk plays, most specific condition first: quest cleared,
// then already spoken to (this scene), then default. An NPC with none of
// those repeats its greeting, so tapping it still zooms in and back out

export const talkLines = (npc: NPCProps, spoken: boolean) => {
    const d = pickDialog(npc, spoken)
    const en = toList(d.en)
    return toList(d.jp).map((jp, i) => ({ jp, en: en[i] ?? '' }))
}
// the lines a talk steps through, one per tap, each paired with its English
// (index-aligned; a missing one is '' = no English line)

export const NPC_TAP_ATTR = 'data-npc'
// GameScene's stick overlay sits above the whole world, so taps never reach
// the NPC itself; the overlay hit-tests the elements carrying this attribute
// (value = the NPC's index) with getBoundingClientRect instead

export default function NPCRenderer({ npc, index, velocity, inRange, selected = false, spoken = false, line }: { // props: **+ spoken**, mechanism: GameScene knows who was talked to; passed so the bubble shows the same entry the scene steps through
    npc: NPCProps,
    index: number,
    velocity: { x: number, y: number },
    inRange: boolean,
    selected?: boolean,
    spoken?: boolean,
    line?: number,
}) {
    const ent = npc.ent
    const cur = line === undefined ? undefined : talkLines(npc, spoken)[line]
    const dialogs: Dialog[] | undefined = selected ? (cur && [{ condition: pickDialog(npc, spoken).condition, jp: cur.jp, en: cur.en }]) : inRange ? [greeting(npc)] : undefined
    // dialogs: **text + en** -> **Dialog[]**, mechanism: talking = just the
    // current line of the picked entry (one line per tap); in range = the
    // whole greeting entry; otherwise no bubble
    const tap = inRange || selected ? { [NPC_TAP_ATTR]: index } : undefined

    return (
        <>
            <EntityRenderer velocity={velocity} ent={ent} />
            {tap && (
                <div
                    {...tap}
                    style={{
                        position: 'absolute',
                        left: ent.x,
                        top: ent.y,
                        width: ent.w,
                        height: ent.h,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                    }}
                />
            )}
            {dialogs && <DialogBubble x={ent.x} y={ent.y} h={ent.h} dialogs={dialogs} tapId={tap && index} />} {/* dialogs: **one wrapped default line** -> **the entry picked above**, mechanism: see dialogs */}
        </>
    )
}
// bubble: near the player it shows the greeting; once selected it shows
// talk line `line`, and nothing while line is undefined (GameScene leaves it
// undefined until the zoom-in has settled). One line at a time, so
// DialogBubble's text changes on each tap and it retypes from the start
// tap targets: an invisible box over the body plus the bubble, both tagged
// NPC_TAP_ATTR, so the NPC or its bubble can be tapped. Only while in range
// or talking, so a far NPC can't be picked
// the bubble is drawn here instead of through EntityRenderer's dialog prop so
// it can carry the tap attribute

// npcs can be clicked or touched when their dialog bubble is on
// when selected zooms into npc
// after zoomed in if they have dialog starts talking
// say dialog = ['おい','頼みがあるんだが','聞いてくれるか？']
// for each line by tapping the dialog, cleared and next line starts to show
// after the last index, tapping the dialog, brings you back to the original zoom
