'use client' // directive: **'user client'** -> **'use client'**, mechanism: typo; React only recognizes the exact 'use client' string

import { useRef } from "react"

const STEP = 10 // world px walked between two prints
const FOOT_SPREAD = 3 // world px each foot sits to the side of the travel line
const PRINT_W = 3 // world px, along the travel direction
const PRINT_H = 2 // world px, across the travel direction
const FADE = 1.5 // seconds from a print being dropped to it being gone
const START_OPACITY = 0.35 // opacity of a fresh print
const MIN = 0.05 // speed fraction below which the player counts as standing, same as GUST_MIN
// Everything is world px, so the scene zoom scales the prints like the body

type Print = { id: number, x: number, y: number, a: number, t: number }

export default function FootPrintRenderer({
    velocity,
    maxSpeed = 1,
    x = 0,
    y = 0,
    h
}: { velocity: { x: number, y: number }, maxSpeed?: number, x?: number, y?: number, h: number }) {
    const printsRef = useRef<Print[]>([])
    const lastRef = useRef<{ x: number, y: number } | null>(null)
    const leftRef = useRef(true)
    const idRef = useRef(0)

    const now = performance.now()
    const feetY = y + h / 2
    const moving = Math.hypot(velocity.x, velocity.y) / maxSpeed >= MIN
    const last = lastRef.current
    if (!moving || !last) {
        lastRef.current = { x, y: feetY }
    } else if (Math.hypot(x - last.x, feetY - last.y) >= STEP) {
        const a = Math.atan2(velocity.y, velocity.x)
        const side = leftRef.current ? -1 : 1
        printsRef.current.push({
            id: idRef.current++,
            x: x - Math.sin(a) * FOOT_SPREAD * side,
            y: feetY + Math.cos(a) * FOOT_SPREAD * side,
            a,
            t: now
        })
        leftRef.current = !leftRef.current
        lastRef.current = { x, y: feetY }
    }
    printsRef.current = printsRef.current.filter(p => now - p.t < FADE * 1000)

    return (
        <>
            {printsRef.current.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: p.x,
                        top: p.y,
                        width: PRINT_W,
                        height: PRINT_H,
                        transform: `translate(-50%, -50%) rotate(${p.a * 180 / Math.PI}deg)`,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0, 0, 0, 1)',
                        opacity: START_OPACITY * (1 - (now - p.t) / (FADE * 1000)),
                        pointerEvents: 'none'
                    }}
                />
            ))}
        </>
    )
}
// The scene re-renders every frame (tick calls force), so this runs once per
// frame with the player's current position. The prints live in a ref, not
// state, so adding one doesn't trigger an extra render. While moving, a print
// is dropped each time the feet (center + h/2) are STEP px from the last one;
// standing still just re-anchors lastRef, so a fresh walk starts a full STEP
// before its first print. Each print is pushed sideways from the travel line
// by (-sin a, cos a) * FOOT_SPREAD, the perpendicular of the travel direction,
// with the sign flipping every step for left/right feet, and rotated to face
// the way the player walked. Opacity is worked out from the print's age on
// every render, so it fades linearly to 0 over FADE, and prints older than
// FADE are filtered out of the ref
