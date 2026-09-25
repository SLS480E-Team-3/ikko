'use client'

import GustRenderer from "./gustRenderer"

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
    // pos: { x: number, y: number },
    // body: { h: number, w: number },
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

export default function EntityRenderer({
    velocity,
    maxSpeed = 1, // props: **no maxSpeed** -> **maxSpeed = 1**, reason: the lean needs to know what full speed is, mechanism: velocity / maxSpeed gives -1..1; default 1 means a caller passing an already-normalized velocity needs nothing
    ent = {
        w: ENT_W,
        h: ENT_H,
        color: 'gray', // temp default
        facing: 'none'
    }
}: { velocity: { x: number, y: number }, maxSpeed?: number, ent?: EntityProps }) {

    const lean = Math.min(Math.max(velocity.x / maxSpeed, -1), 1) // skew: **full TILT_MAX on any x** -> **TILT_MAX x x-speed fraction**, reason: a slight joystick push leaned the body all the way, mechanism: x speed / max speed clamped to -1..1 scales the angle, so a half push leans half (diagonals lean ~0.71 since only that much of the speed is sideways)
    const skew = `skewX(${-TILT_MAX * lean}deg)` // skew: **ternary picking ±TILT_MAX or ''** -> **one proportional skewX**, reason: same as lean, mechanism: negative lean (moving left) flips the sign; standing still gives skewX(0deg), which draws the same as no skew

    return (
        <>
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
        </>
    )
}