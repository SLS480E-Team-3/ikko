'use client'

import { ComponentProps, PointerEvent, useEffect, useRef, useState } from "react" // imports: **no useEffect** -> **+ useEffect**, reason: the overlay's wheel listener, mechanism: attached/removed in an effect below
import GameScene, { clampZoom, wheelZoom, ZOOM_DEF } from "./gameScene" // imports: **clampZoom, ZOOM_DEF** -> **+ wheelZoom**, reason: wheel over the stick half didn't zoom, mechanism: the overlay reuses GameScene's wheel step

const RADIUS = 50 // css px the knob can travel from the base center
const DEADZONE = 0.15 // fraction of RADIUS treated as "not pushed"
const KNOB_SIZE = 44 // css px
// RADIUS sets both the drawn ring and how far a full push is; DEADZONE keeps
// a resting thumb's jitter from flipping the player's skew/rotate
export const SENSITIVITY_DEF = 1.3
// default stick sensitivity: a full push takes RADIUS / 1.3 ~= 42px of drag
// instead of 50, so the stick reaches full speed slightly sooner

type Stick = { base: { x: number, y: number }, knob: { x: number, y: number } }

export default function MobileGameScene({ sensitivity = SENSITIVITY_DEF, ...props }: Omit<ComponentProps<typeof GameScene>, 'moveInput' | 'zoomInput'> & { sensitivity?: number }) { // props: **no sensitivity** -> **sensitivity?**, reason: tune how far a full push is (MobileTester has an input for it), mechanism: pulled out of props so it isn't passed on to GameScene; the rest still spreads through // props: **Omit moveInput** -> **Omit moveInput | zoomInput**, reason: the pinch below owns the zoom, mechanism: this component always passes zoomInput itself, so callers can't
    // takes the same optional props as GameScene (bgProps, player,
    // screenSize) and passes them through; ComponentProps reads them off
    // GameScene so its local BGProps type doesn't need exporting

    const stickRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })
    const activeIdRef = useRef<number | null>(null)
    const [stick, setStick] = useState<Stick | null>(null)
    const zoomRef = useRef<number>(ZOOM_DEF)
    const pointersRef = useRef<Map<number, { x: number, y: number }>>(new Map())
    const pinchRef = useRef<{ dist0: number, zoom0: number } | null>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    // zoomRef = GameScene's target zoom (its tick eases toward it).
    // pointersRef = every finger currently down anywhere on the scene, by
    // pointerId. pinchRef = the finger distance and zoom when the pinch
    // started; null = not pinching
    // stickRef is what GameScene's rAF tick reads (-1..1 per axis, length
    // <= 1) -- a ref so a move doesn't need a render to reach the loop.
    // activeIdRef = the one pointer driving the stick. stick is only for
    // drawing the ring/knob; null = nothing on screen

    const reach = RADIUS / Math.max(sensitivity, 0.1)
    // css px of drag for a full push, also the drawn ring's radius so the
    // knob still stops on the ring's edge. Max(0.1) guards a 0 / empty input
    // from dividing by zero

    const release = () => {
        activeIdRef.current = null
        stickRef.current = { x: 0, y: 0 }
        setStick(null)
    }
    // shared by up / cancel / lost capture: without it the player would keep
    // walking after the thumb lifts or iOS cancels the touch (e.g. a
    // notification or system swipe)

    const handleDown = (e: PointerEvent<HTMLDivElement>) => {
        if (activeIdRef.current !== null || pinchRef.current) return // guard: **stick already held** -> **+ while pinching**, reason: a finger landing mid-pinch shouldn't start walking, mechanism: pinchRef is set from the second finger down until fewer than two remain
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
        if (e.pointerId !== activeIdRef.current || !stick || pinchRef.current) return // guard: **not the stick finger** -> **+ while pinching**, reason: same as handleDown, mechanism: release() already cleared the stick when the pinch started, this also covers a stale stick state from the same frame
        const rect = e.currentTarget.getBoundingClientRect()
        const dx = e.clientX - rect.left - stick.base.x
        const dy = e.clientY - rect.top - stick.base.y
        const dist = Math.hypot(dx, dy)
        const scale = dist > reach ? reach / dist : 1 // radius: **RADIUS** -> **reach**, reason: sensitivity, mechanism: reach = RADIUS / sensitivity, so a higher sensitivity needs less drag for a full push (same for the 3 lines below)
        const cx = dx * scale
        const cy = dy * scale
        const push = Math.min(dist, reach) / reach
        stickRef.current = push < DEADZONE ? { x: 0, y: 0 } : { x: cx / reach, y: cy / reach }
        setStick({ base: stick.base, knob: { x: stick.base.x + cx, y: stick.base.y + cy } })
    }
    // the offset from the base is shrunk onto the ring when the thumb goes
    // past reach, so the knob stays on the edge and the vector's length
    // tops out at 1 (full speed). Inside the deadzone the output is 0, so
    // GameScene falls back to the keyboard

    const fingerDist = () => {
        const [a, b] = [...pointersRef.current.values()]
        return Math.hypot(a.x - b.x, a.y - b.y)
    }

    const handlePinchDown = (e: PointerEvent<HTMLDivElement>) => {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pointersRef.current.size === 2) {
            pinchRef.current = { dist0: fingerDist() || 1, zoom0: zoomRef.current }
            release()
        }
    }

    const handlePinchMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const pinch = pinchRef.current
        if (pinch && pointersRef.current.size >= 2) {
            zoomRef.current = clampZoom(pinch.zoom0 * fingerDist() / pinch.dist0)
        }
    }

    const handlePinchUp = (e: PointerEvent<HTMLDivElement>) => {
        pointersRef.current.delete(e.pointerId)
        if (pointersRef.current.size < 2) pinchRef.current = null
    }
    // these sit on the outer wrapper, so pointer events from the full-screen
    // stick overlay bubble up to them and a pinch works anywhere. The second finger down starts the pinch and
    // releases the stick so the player stops. The zoom is the start zoom times
    // how much the finger distance grew (spread = in, pinch = out), in client
    // px so it doesn't matter which element each finger is over. fingerDist
    // uses the first two fingers; || 1 avoids /0 if both land on one point.
    // Below two fingers the pinch ends and the leftover finger does nothing
    // until it lifts

    useEffect(() => {
        const el = overlayRef.current
        if (!el) return
        const handleWheel = (e: WheelEvent) => wheelZoom(e, zoomRef)
        el.addEventListener('wheel', handleWheel, { passive: false })
        return (() => {
            el.removeEventListener('wheel', handleWheel)
        })
    }, [])
    // the stick overlay is a sibling of GameScene's scene div, not inside it,
    // and covers all of it, so wheel events never reach GameScene's listener
    // (kept for a bare <GameScene />). This gives the overlay the same
    // native, non-passive listener, writing to zoomRef -- the target
    // GameScene already eases toward. No double step: a wheel event only
    // bubbles through one of the two siblings

    return (
        <div
            onPointerDown={handlePinchDown}
            onPointerMove={handlePinchMove}
            onPointerUp={handlePinchUp}
            onPointerCancel={handlePinchUp}
            style={{ position: 'relative', width: '100%', height: '100%', touchAction: 'none' }} // style: **no touchAction** -> **touchAction none**, reason: a pinch on the right half zoomed the browser page instead of the game, mechanism: touch-action applies to touches starting on any descendant, so the whole scene stops browser pan/zoom (the overlay had it only for the left half)
        >
            <GameScene {...props} moveInput={stickRef} zoomInput={zoomRef} /> {/* props: **moveInput** -> **+ zoomInput**, reason: pinch zoom, mechanism: GameScene eases its drawn zoom toward zoomRef each tick */}
            <div
                ref={overlayRef} // ref: **none** -> **overlayRef**, reason: the wheel effect needs the element, mechanism: native addEventListener on it
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={release}
                onPointerCancel={release}
                onLostPointerCapture={release}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%', // style: **width 50%** -> **width 100%**, reason: the stick could only start on one half of the screen, mechanism: the overlay now covers the whole scene so a thumb landing anywhere hits handleDown (GameScene has no pointer handlers of its own to block)
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
                            left: stick.base.x - reach, // ring: **RADIUS** -> **reach**, reason: the ring should match the sensitivity-scaled push distance, mechanism: same reach handleMove clamps the knob to
                            top: stick.base.y - reach,
                            width: reach * 2,
                            height: reach * 2,
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
    // the overlay sits over the whole scene (zIndex above the world), so the
    // stick can start anywhere; future on-screen buttons need a higher zIndex
    // than it to receive taps. touchAction none
    // stops the browser from scrolling / pinch-zooming during a drag, and
    // userSelect none stops a long press from selecting text. Ring and knob
    // are centered on their points by subtracting half their size, and have
    // pointerEvents none so they never steal the drag from the overlay
}
