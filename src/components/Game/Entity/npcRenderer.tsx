'use client'

import { QuestsProps } from "@/utils/schema"
import EntityRenderer, { EntityProps } from "./entityRenderer"
import DialogBubble from "./dialogBubble"

export type NPCProps = {
    ent: EntityProps, // shape: **EntityProps & {...}** -> **{ ent, ... }**, reason: GameScene already keeps NPCs as { ent, dialog }, mechanism: the entity box stays one object, so the scene's solids / range checks read n.ent like the player's
    greeting?: string // short greeting default こんにちは // greeting: **required** -> **optional**, mechanism: GREETING_DEF fills it in below, so test / db NPCs can leave it out
    dialog?: string[],
    quest?: { id: number, title: string, status?: 'done' | 'resume' }
}
// selected: **in NPCProps** -> **NPCRenderer prop**, reason: which NPC is
// talking is scene state, not NPC data, mechanism: GameScene passes
// selected / line per NPC each frame, so the NPC list stays static

export const GREETING_DEF = 'こんにちは'

export const talkLines = (npc: NPCProps) => npc.dialog?.length ? npc.dialog : [npc.greeting ?? GREETING_DEF]
// the lines a talk steps through: the dialog, or just the greeting for an
// NPC with nothing more to say, so tapping it still zooms in and back out

export const NPC_TAP_ATTR = 'data-npc'
// GameScene's stick overlay sits above the whole world, so taps never reach
// the NPC itself; the overlay hit-tests the elements carrying this attribute
// (value = the NPC's index) with getBoundingClientRect instead

export default function NPCRenderer({ npc, index, velocity, inRange, selected = false, line }: {
    npc: NPCProps,
    index: number,
    velocity: { x: number, y: number },
    inRange: boolean,
    selected?: boolean,
    line?: number,
}) {
    const ent = npc.ent
    const text = selected ? (line === undefined ? undefined : talkLines(npc)[line]) : inRange ? npc.greeting ?? GREETING_DEF : undefined
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
            {text !== undefined && <DialogBubble x={ent.x} y={ent.y} h={ent.h} text={text} tapId={tap && index} />}
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
