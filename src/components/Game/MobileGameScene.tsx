'use client'

import { ComponentProps, PointerEvent, useRef, useState } from "react"
import GameScene from "./gameScene"

const RADIUS = 50 // css px the knob can travel from the base center
const DEADZONE = 0.15 // fraction of RADIUS treated as "not pushed"
const KNOB_SIZE = 44 // css px
// RADIUS sets both the drawn ring and how far a full push is; DEADZONE keeps
// a resting thumb's jitter from flipping the player's skew/rotate

type Stick = { base: { x: number, y: number }, knob: { x: number, y: number } }

export default function MobileGameScene(props: Omit<ComponentProps<typeof GameScene>, 'moveInput'>) {
    // takes the same optional props as GameScene (bgProps, player,
    // screenSize) and passes them through; ComponentProps reads them off
    // GameScene so its local BGProps type doesn't need exporting

    const stickRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })
    const activeIdRef = useRef<number | null>(null)
    const [stick, setStick] = useState<Stick | null>(null)
    // stickRef is what GameScene's rAF tick reads (-1..1 per axis, length
    // <= 1) -- a ref so a move doesn't need a render to reach the loop.
    // activeIdRef = the one pointer driving the stick. stick is only for
    // drawing the ring/knob; null = nothing on screen

    const release = () => {
        activeIdRef.current = null
        stickRef.current = { x: 0, y: 0 }
        setStick(null)
    }
    // shared by up / cancel / lost capture: without it the player would keep
    // walking after the thumb lifts or iOS cancels the touch (e.g. a
    // notification or system swipe)

    const handleDown = (e: PointerEvent<HTMLDivElement>) => {
        if (activeIdRef.current !== null) return
        activeIdRef.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        const rect = e.currentTarget.getBoundingClientRect()
        const base = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        setStick({ base, knob: base })
    }
    // floating stick: the base appears wherever the thumb lands. A second
    // finger is ignored so it can't hijack the stick. Pointer capture keeps
    // move/up events coming to this div even after the finger slides past
    // its edge. Positions are overlay-local px so they match the drawing below

    const handleMove = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerId !== activeIdRef.current || !stick) return
        const rect = e.currentTarget.getBoundingClientRect()
        const dx = e.clientX - rect.left - stick.base.x
        const dy = e.clientY - rect.top - stick.base.y
        const dist = Math.hypot(dx, dy)
        const scale = dist > RADIUS ? RADIUS / dist : 1
        const cx = dx * scale
        const cy = dy * scale
        const push = Math.min(dist, RADIUS) / RADIUS
        stickRef.current = push < DEADZONE ? { x: 0, y: 0 } : { x: cx / RADIUS, y: cy / RADIUS }
        setStick({ base: stick.base, knob: { x: stick.base.x + cx, y: stick.base.y + cy } })
    }
    // the offset from the base is shrunk onto the ring when the thumb goes
    // past RADIUS, so the knob stays on the edge and the vector's length
    // tops out at 1 (full speed). Inside the deadzone the output is 0, so
    // GameScene falls back to the keyboard

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <GameScene {...props} moveInput={stickRef} />
            <div
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '50%',
                    height: '100%',
                    zIndex: 1,
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                }}
            >
                {stick && (
                    <>
                        <div style={{
                            position: 'absolute',
                            left: stick.base.x - RADIUS,
                            top: stick.base.y - RADIUS,
                            width: RADIUS * 2,
                            height: RADIUS * 2,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.25)',
                            border: '2px solid rgba(255, 255, 255, 0.6)',
                            boxSizing: 'border-box',
                            pointerEvents: 'none'
                        }} />
                        <div style={{
                            position: 'absolute',
                            left: stick.knob.x - KNOB_SIZE / 2,
                            top: stick.knob.y - KNOB_SIZE / 2,
                            width: KNOB_SIZE,
                            height: KNOB_SIZE,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.8)',
                            pointerEvents: 'none'
                        }} />
                    </>
                )}
            </div>
        </div>
    )
    // the overlay sits over the left half of the scene (zIndex above the
    // world); the right half stays free for future buttons. touchAction none
    // stops the browser from scrolling / pinch-zooming during a drag, and
    // userSelect none stops a long press from selecting text. Ring and knob
    // are centered on their points by subtracting half their size, and have
    // pointerEvents none so they never steal the drag from the overlay
}
