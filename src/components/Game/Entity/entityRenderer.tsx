'use client'

import GustRenderer from "./gustRenderer"
import DialogBubble from "./dialogBubble"

export type Facing =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'up-left'
    | 'up-right'
    | 'down-left'
    | 'down-right'
    | 'none'

export type EntityProps = {
    name?: string,
    x?: number,
    y?: number,
    w: number,
    h: number,
    deg?: number 

    color?: string,

    facing: Partial<Facing>
}

const TILT_MAX = 16
// one constant per direction, named after it, so the ternary below reads
// as a lookup and any single angle can change without touching the others

export const ENT_W = 12
export const ENT_H = 20
// exported so wrappers (player name tag) can fall back to the same default
// size EntityRenderer uses when no ent is passed

const NAME_GAP = 4 // px between the top of the body and the name
const NAME_SIZE = 8 // world px, scaled by the scene zoom like everything else
// NAME_GAP / NAME_SIZE: **in playerRenderer** -> **here**, mechanism: the name tag moved in with ent.name, so NPCs get the same tag

export default function EntityRenderer({
    velocity,
    maxSpeed = 1, // props: **no maxSpeed** -> **maxSpeed = 1**, reason: the lean needs to know what full speed is, mechanism: velocity / maxSpeed gives -1..1; default 1 means a caller passing an already-normalized velocity needs nothing
    ent = {
        w: ENT_W,
        h: ENT_H,
        color: 'gray', // temp default
        facing: 'none'
    },
    dialog, // props: **no dialog** -> **dialog?**, reason: player and NPC speech bubbles, mechanism: undefined = no bubble; any string (even '') shows one, and DialogBubble turns '' into '...'
}: { velocity: { x: number, y: number }, maxSpeed?: number, ent?: EntityProps, dialog?: string }) {

    const lean = Math.min(Math.max(velocity.x / maxSpeed, -1), 1) // skew: **full TILT_MAX on any x** -> **TILT_MAX x x-speed fraction**, reason: a slight joystick push leaned the body all the way, mechanism: x speed / max speed clamped to -1..1 scales the angle, so a half push leans half (diagonals lean ~0.71 since only that much of the speed is sideways)
    const skew = `skewX(${-TILT_MAX * lean}deg)` // skew: **ternary picking ±TILT_MAX or ''** -> **one proportional skewX**, reason: same as lean, mechanism: negative lean (moving left) flips the sign; standing still gives skewX(0deg), which draws the same as no skew

    return (
        <>
        {ent.name && (
            <div
                style={{
                    position: 'absolute',
                    left: ent.x,
                    top: ent.y,
                    transform: `translate(-50%, calc(-100% - ${ent.h / 2 + NAME_GAP}px))`,
                    fontSize: NAME_SIZE,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    zIndex: 1 // layer: **source order (under the gust)** -> **zIndex 1**, reason: moving down, the gust trails up into the name and was drawn over it, mechanism: the name and the gust/body are absolute siblings in the same stacking context, so zIndex 1 paints the name above them instead of in DOM order
                }}
            >
                {ent.name}
            </div>
        )} {/* name tag: **PlayerRenderer, from player.name** -> **EntityRenderer, from ent.name**, mechanism: EntityProps carries the name now, so any entity (player or NPC) with a name gets the tag; same styles and anchor as before */}
        {/* the name is a sibling of the body, not a child, so it doesn't
            pick up the body's skew and stays upright. It anchors on the same
            center point (x, y): -50% x centers it, then y moves up by its own
            height (-100%) plus half the body and a gap, so its bottom edge
            sits NAME_GAP above the body's top. nowrap keeps the name on one
            line (absolute + zero-width parent would wrap it) */}
        <GustRenderer velocity={velocity} maxSpeed={maxSpeed} x={ent.x} y={ent.y} w={ent.w} h={ent.h} /> {/* render: **body only** -> **gust + body**, reason: white lines trail behind a moving entity, longer the faster it goes, mechanism: rendered as a sibling before the body so the body draws on top and the gust doesn't inherit its skew/rotate */}
        <div
            style={{
                position: 'absolute',
                left: ent.x,
                top: ent.y,
                width: ent.w,
                height: ent.h,
                transform: `translate(-50%, -50%) ${skew}`,
                // transition: 'background-color 0.2s, transform 0.15s ease-out',
                backgroundColor: ent.color
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: ent.h - 16,
                    height: 4,
                    width: 4,
                    left: 0,
                    backgroundColor: 'black'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: ent.h - 16,
                    height: 4,
                    width: 4,
                    right: 0,
                    backgroundColor: 'black'
                }}
            />
            {/* absolute children ignore justifyContent (that's a flex-container
                prop), so left/right pin each eye to its own side of the body */}
        </div>
        {dialog !== undefined && <DialogBubble x={ent.x} y={ent.y} h={ent.h} dialogs={[{ condition: 'default', jp: dialog, en: [] }]} />} {/* props: **text={dialog}** -> **dialog={[Dialog]}**, mechanism: DialogBubble takes Dialog[] now; the string becomes one default entry with no English, '' still pages as '...' */}
        {/* after the body so it draws on top; a sibling, not a child, so the
            lean skew doesn't reach it. It anchors on the same center x/y and
            height the body uses, so it follows the entity as it moves */}
        </>
    )
}