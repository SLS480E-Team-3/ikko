'use client'

import { useRef } from "react"

const GUST_MIN = 0.05 // speed fraction below which no gust is drawn
const GUST_LEN = 14 // world px, each line's length at full speed // comment: **the middle line's length** -> **each line's length**, reason: LINE_SCALE is now all 1, mechanism: same as the LINE_SCALE comment
const GUST_GAP = 10 // world px between the body's back edge and the lines // gap: **2** -> **15**, reason: the lines sat too close to the body, mechanism: every line's right edge is back + GUST_GAP from the center, so this pushes all three further behind
const GUST_SPREAD = 4 // world px between neighbouring lines
const GUST_THICK = 2 // world px, each line's thickness // thickness: **1.5** -> **2**, reason: the three lines looked different thicknesses, mechanism: a whole-px thickness with no translateY(-50%) keeps every line's top and bottom edge on the same fraction of a pixel, so the browser blurs all three the same way (1.5 minus 0.75 left each edge on a quarter pixel, which renders unevenly as the camera moves)
const LINE_SCALE = [1, 1, 1]
const GUST_FADE = 0.3 // seconds the gust takes to fade out after stopping
const GUST_FADE_IN = 0.15 // seconds the gust takes to fade in after starting to move
// shorter than the fade-out so the gust shows up almost right away when you start moving
// one entry per line (top, middle, bottom in the travel frame), each a
// multiplier on GUST_LEN: all 1 so the three lines are the same length // comment: **middle one is longest** -> **all the same length**, reason: LINE_SCALE changed from [0.7, 1, 0.7] to [1, 1, 1], mechanism: describes the current values
// Everything is world px, so the scene zoom scales it like the body

export default function GustRenderer({
    velocity,
    maxSpeed = 1,
    x,
    y,
    w,
    h
}: { velocity: { x: number, y: number }, maxSpeed?: number, x?: number, y?: number, w: number, h: number }) {
    // plain x/y/w/h instead of EntityProps: EntityRenderer has already
    // applied its defaults, and importing nothing from it avoids a
    // circular import (EntityRenderer imports this file)

    const lastRef = useRef<{ frac: number, a: number }>({ frac: 0, a: 0 }) // start: **null** -> **zero-length gust**, reason: fade in on the first move too, mechanism: the gust is mounted from the start at opacity 0 with 0-width lines, so the first move is a change from 0 to 1 that the transition animates (a gust mounted straight at opacity 1 has nothing to fade from)
    const speedFrac = Math.min(Math.hypot(velocity.x, velocity.y) / maxSpeed, 1)
    const moving = speedFrac >= GUST_MIN
    if (moving) lastRef.current = { frac: speedFrac, a: Math.atan2(velocity.y, velocity.x) } // stopped: **return null** -> **remember the last moving frac/angle**, reason: the gust needs something to draw while it fades out, mechanism: the ref keeps the last shape across renders, so after stopping the lines stay where they were (same length and direction) and only the opacity changes
    const { frac, a } = lastRef.current // before first move: **return null** -> **always rendered**, reason: same as lastRef, mechanism: same as lastRef // source: **this frame's velocity** -> **last moving frame**, reason: same as lastRef, mechanism: while moving it is this frame's value
    // speed as a fraction of full speed (0..1) -- drives the line length.
    // Below GUST_MIN (standing, or float noise) counts as stopped: the last
    // gust is kept and faded out instead of drawn fresh

    const back = Math.abs(Math.cos(a)) * w / 2 + Math.abs(Math.sin(a)) * h / 2
    // a = direction of travel (radians, screen y points down). back = how far
    // the body's edge is from its center along that direction (rectangle
    // support distance): w/2 moving sideways, h/2 moving up/down, a blend on
    // diagonals -- so the lines always start just off the back edge

    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: 0,
                height: 0,
                transform: `rotate(${a * 180 / Math.PI}deg)`,
                opacity: moving ? 1 : 0, // visibility: **unmount when stopped** -> **opacity 1 / 0**, reason: fade out instead of vanishing, mechanism: dropping to 0 while stopped lets the transition below animate it
                transition: `opacity ${moving ? `${GUST_FADE_IN}s ease-in` : `${GUST_FADE}s ease-out`}`, // fade: **fade out only (moving: 'none')** -> **fade in and out**, reason: the gust popped in at full opacity, mechanism: CSS uses the transition of the state being entered, so going to 1 animates over GUST_FADE_IN and going to 0 over GUST_FADE; stopping mid-fade-in (or restarting mid-fade-out) transitions from the current opacity
                pointerEvents: 'none'
            }}
        >
            {LINE_SCALE.map((scale, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        right: back + GUST_GAP,
                        top: (i - 1) * GUST_SPREAD - GUST_THICK / 2, // centering: **translateY(-50%)** -> **- GUST_THICK / 2**, reason: same as GUST_THICK, mechanism: shifts up by half the thickness in whole px instead of a percent transform
                        width: frac * GUST_LEN * scale,
                        height: GUST_THICK, // thickness: **1.5** -> **GUST_THICK**, reason: same as GUST_THICK, mechanism: same as GUST_THICK
                        backgroundColor: 'white',
                        transition: 'width 0.15s ease-out'
                    }}
                />
            ))}
        </div>
    )
    // the wrapper is a 0x0 point on the body's center, rotated to face the
    // travel direction, so inside it "behind" is always -x. right: back + gap
    // pins each line's front end just behind the body and it grows away from
    // it as speed rises. top (i - 1) * SPREAD stacks the lines -4/0/+4 across
    // the travel direction; - GUST_THICK / 2 centers each on its offset.
    // width eases like the body's lean transition
}
