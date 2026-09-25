'use client'

import { useEffect, useRef, useState } from "react"
import PlayerRenderer, { PlayerProps } from "./Entity/playerRenderer"
import { ENT_H, ENT_W } from "./Entity/entityRenderer"


type BGProps = {
    x: number,
    y: number,
    w: number,
    h: number,

    color: string
}

const BG_H = 10_000
const BG_W = 7_000
export const BG_COLOR = 'lightgreen' // export: **local** -> **exported**, reason: Game/layout.tsx paints the page background with it, mechanism: named export next to the default GameScene export, same as ZOOM_DEF

const TEMP_BG: BGProps = {
    x: BG_W / 2,
    y: BG_H / 2,
    w: BG_W,
    h: BG_H,
    color: BG_COLOR
}

// longest frame interval (seconds) one tick will simulate
const MAX_DT = 1 / 10
// rAF pauses in background tabs, so the first frame back can report a
// multi-second gap -- clamping stops everything from teleporting

type SceneProps = {
    backGround: BGProps,

}

export const ZOOM_DEF = 1 // export: **local** -> **exported**, reason: MobileGameScene's pinch starts its zoom ref here, mechanism: named export next to the default GameScene export
const ZOOM_MIN = 0.2
const ZOOM_MAX = 4

export const clampZoom = (z: number) => Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX)
// one place for the zoom limits, shared by the wheel here and the pinch in
// MobileGameScene so both stop at the same min/max

const WHEEL_ZOOM_RATE = 0.0015 // zoom per wheel delta px: a 100px mouse notch is exp(-0.15), about 14%
const PINCH_WHEEL_RATE = 0.01 // trackpad pinch arrives as ctrl+wheel with small deltas, so it needs a bigger rate
const ZOOM_EASE_RATE = 0.3 // fraction of the gap to the target zoom closed per 60fps frame
// the wheel/pinch set a target zoom and the tick eases toward it, so a
// wheel notch glides instead of jumping

export const wheelZoom = (e: WheelEvent, target: { current: number }) => {
    e.preventDefault()
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : 1)
    const rate = e.ctrlKey ? PINCH_WHEEL_RATE : WHEEL_ZOOM_RATE
    target.current = clampZoom(target.current * Math.exp(-delta * rate))
}
// one wheel -> target zoom step, shared by GameScene's own listener and
// MobileGameScene's stick overlay (a sibling of the scene, so its wheel
// events never reach GameScene). preventDefault stops ctrl+wheel /
// trackpad pinch from zooming the page. deltaMode 1 (Firefox) reports
// lines, ~16px each. exp(-delta * rate) zooms by the same ratio per notch
// at any zoom level; wheel up (negative delta) zooms in

const VIEWPORT_FOLLOW_RATE = 0.1

const PLAYER_SPEED = 120 // world px/second

const TEST_PLAYER: PlayerProps = { // in final will be made from db User info
    name: 'Player',
    ent: {
        x: BG_W / 2,
        y: BG_H / 2,
        w: ENT_W,
        h: ENT_H,
        color: 'coral',
        facing: 'none'
    }
}
// spawns at the world center; the camera starts on the player's spawn point
// (viewPortRef) and follows from there

const SCENE_PADDING = 50

export default function GameScene({ bgProps = TEMP_BG, player = TEST_PLAYER, screenSize, moveInput, zoomInput }: { bgProps?: BGProps, player?: PlayerProps, screenSize?: { w: number, h: number }, moveInput?: { current: { x: number, y: number } }, zoomInput?: { current: number } }) { // props: **no zoomInput** -> **zoomInput?**, reason: lets MobileGameScene's pinch set the zoom, mechanism: a ref holding the target zoom that the wheel and the tick share; optional so a bare <GameScene /> uses its own ref // props: **no moveInput** -> **moveInput?**, reason: lets MobileGameScene's joystick steer the player, mechanism: a ref object (-1..1 per axis, length <= 1) the tick reads each frame; optional so a bare <GameScene /> stays keyboard-only
    // props are optional (?) because they have defaults -- lets a page mount
    // a bare <GameScene /> while the db-backed bg/player aren't wired yet.
    // screenSize has no default and isn't read yet, so it's undefined for now

    const [, force] = useState<number>(0)

    const playerRef = useRef<PlayerProps>({ ...player, ent: player.ent && { ...player.ent } })
    const inputRef = useRef<Set<string>>(new Set<string>())
    const velocityRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })

    const bgRef = useRef<BGProps>(bgProps)
    const dtRef = useRef<number>(0)
    const viewPortRef = useRef<{ x: number, y: number }>({
        x: playerRef.current.ent?.x ?? bgProps.x,
        y: playerRef.current.ent?.y ?? bgProps.y
    })
    // x/y moved under PlayerProps.ent and are optional there, so read them
    // through ent?. and fall back to the bg center (where the camera already
    // looks) -- keeps the ref typed as plain numbers
    const zoomRef = useRef<number>(ZOOM_DEF)
    const ownZoomTarget = useRef<number>(ZOOM_DEF)
    const zoomTarget = zoomInput ?? ownZoomTarget
    // zoomRef = the zoom drawn this frame; zoomTarget = where the wheel/pinch
    // wants it. Uses the parent's ref when given (pinch), else its own. Both
    // are stable ref objects, so the mount-time tick/wheel closures stay current
    const sceneRef = useRef<HTMLDivElement>(null)
    const sceneSizeRef = useRef<{ w: number, h: number }>({ w: 0, h: 0 })
    // on-screen size of the scene box in css px, measured below -- the
    // camera clamp needs it to know how much world is visible
    // const npcRef = useRef()
    // positions live in refs so the loop mutates them without a render per
    // change; force() below does one render per frame instead. bgRef takes
    // the prop only on mount -- later changes go through bgRef.current

    useEffect(() => {
        let frame = 0
        let last: number | null = null

        const tick = (now: number) => {
            const dt = last === null ? 0 : Math.min((now - last) / 1000, MAX_DT)
            last = now
            dtRef.current = dt

            // move things by speed * dt here (speed in px/second)
            const keys = inputRef.current
            const dx = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0)
            const dy = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0)
            const len = Math.hypot(dx, dy) || 1
            const vel = velocityRef.current
            const stick = moveInput?.current
            const useStick = !!stick && (stick.x !== 0 || stick.y !== 0)
            vel.x = (useStick ? stick.x : dx / len) * PLAYER_SPEED // input: **keys only** -> **stick while pushed, else keys**, reason: phones have no keyboard, mechanism: stick length <= 1 so a half push walks at half speed (analog); moveInput is a stable ref so reading it from this mount-time closure stays current
            vel.y = (useStick ? stick.y : dy / len) * PLAYER_SPEED // input: **keys only** -> **stick while pushed, else keys**, reason: same as vel.x, mechanism: same as vel.x
            // each axis is -1/0/1 (opposite keys cancel). Dividing by the
            // length makes diagonals the same speed as straight moves instead
            // of ~1.41x; `|| 1` avoids 0/0 when nothing is held. vel is
            // mutated in place, so PlayerRenderer (holding the same object)
            // sees the new signs for its skew/rotate

            const ent = playerRef.current.ent
            const bg = bgRef.current
            if (ent) {
                ent.x = Math.min(Math.max((ent.x ?? 0) + vel.x * dt, ent.w / 2), bg.w - ent.w / 2)
                ent.y = Math.min(Math.max((ent.y ?? 0) + vel.y * dt, ent.h / 2), bg.h - ent.h / 2)
            }
            // position += velocity * dt keeps speed the same at any frame
            // rate; clamped to 0..bg.w/h so the player can't leave the world

            const view = viewPortRef.current
            const follow = 1 - Math.pow(1 - VIEWPORT_FOLLOW_RATE, dt * 60)
            view.x += ((ent?.x ?? view.x) - view.x) * follow
            view.y += ((ent?.y ?? view.y) - view.y) * follow
            // the camera closes a fraction of the gap to the player each frame,
            // so it eases in behind them instead of being locked on.
            // VIEWPORT_FOLLOW_RATE is the fraction per 60fps frame; the pow
            // rescales it by dt so a 120Hz or laggy screen follows at the same
            // speed (closing 0.4 twice at 120Hz would overshoot 60Hz's 0.4)

            const zoomFollow = 1 - Math.pow(1 - ZOOM_EASE_RATE, dt * 60)
            zoomRef.current += (zoomTarget.current - zoomRef.current) * zoomFollow
            // eases the drawn zoom toward the target the same dt-corrected way
            // the camera follows the player, so frame rate doesn't change the
            // speed. Done before the clamp below so it uses this frame's zoom

            const zoom = zoomRef.current
            const halfW = sceneSizeRef.current.w / 2 / zoom
            const halfH = sceneSizeRef.current.h / 2 / zoom
            view.x = bg.w <= halfW * 2 ? bg.w / 2 : Math.min(Math.max(view.x, halfW), bg.w - halfW)
            view.y = bg.h <= halfH * 2 ? bg.h / 2 : Math.min(Math.max(view.y, halfH), bg.h - halfH)
            // halfW/halfH = half the visible area in world px (screen px / zoom).
            // Keeping the camera at least that far from each edge means the
            // screen never shows past the world; if the world is smaller than
            // the screen on an axis (e.g. zoomed far out) it just centers it.
            // Clamped after the easing so the camera stops flat at the edge
            // while the player keeps walking toward it

            force(f => f + 1)
            frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return (() => {
            cancelAnimationFrame(frame)
        })

    }, [])

    useEffect(() => {
        const el = sceneRef.current
        if (!el) return
        const measure = () => {
            sceneSizeRef.current = { w: el.clientWidth, h: el.clientHeight }
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return (() => {
            observer.disconnect()
        })
    }, [])
    // measures once right away (before the first rAF tick uses it), then a
    // ResizeObserver keeps it current when the box changes -- phone rotation,
    // mobile browser bars showing/hiding (100dvh), window resize

    useEffect(() => {
        const el = sceneRef.current
        if (!el) return
        const handleWheel = (e: WheelEvent) => wheelZoom(e, zoomTarget) // body: **inline wheel math** -> **wheelZoom helper**, reason: MobileGameScene's stick overlay needs the same step, mechanism: the math moved into the exported wheelZoom above, unchanged
        el.addEventListener('wheel', handleWheel, { passive: false })
        return (() => {
            el.removeEventListener('wheel', handleWheel)
        })
    }, [])
    // native listener because React's onWheel is passive and can't
    // preventDefault (see wheelZoom). Only the target changes -- the tick
    // eases the drawn zoom toward it

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            inputRef.current.add(e.code)
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            inputRef.current.delete(e.code)
        }

        const handleBlur = () => {
            inputRef.current.clear()
        }
        // if the window loses focus while a key is held, its keyup never
        // arrives and the player would keep walking -- drop everything instead

        addEventListener('keydown', handleKeyDown)
        addEventListener('keyup', handleKeyUp)
        addEventListener('blur', handleBlur)
        return (() => {
            removeEventListener('keydown', handleKeyDown)
            removeEventListener('keyup', handleKeyUp)
            removeEventListener('blur', handleBlur)
        })
    }, [])
    // [] subscribes once on mount -- with no deps array it re-subscribed on
    // every render, i.e. every frame. e.code ('KeyW') is the physical key, so
    // WASD works on any keyboard layout

    const bg = bgRef.current

    return (
        <div ref={sceneRef} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* sceneRef: the box whose size the camera clamp measures */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: bg.w,
                    height: bg.h,
                    transform: `scale(${zoomRef.current}) translate(${-viewPortRef.current.x}px, ${-viewPortRef.current.y}px)`,
                    // camera point is now the viewport ref (eased toward the
                    // player in the tick) instead of the fixed bg center
                    transformOrigin: '0 0',
                    backgroundColor: bg.color
                }}
            >
                {/* entities go here, sized/positioned in world px (no zoom) */}
                <PlayerRenderer velocity={velocityRef.current} maxSpeed={PLAYER_SPEED} player={playerRef.current} /> {/* props: **velocity, player** -> **+ maxSpeed**, reason: lean scales with how hard the stick is pushed, mechanism: PLAYER_SPEED is full speed, so vel.x / PLAYER_SPEED is the stick's x (or ±1 / ±0.71 on keys); passed as a prop because the renderers importing it from here would be a circular import */}
                {/* reads straight from the refs; force() re-renders every frame,
                    so ref mutations in the tick show up on the next frame */}
            </div>
        </div>
    )
    // zoom is applied once, here: everything inside this div is in world px
    // and gets scaled together. Transforms run right-to-left on a point --
    // translate moves the camera point to the origin, then scale zooms around
    // that origin (transformOrigin 0 0), so the camera point stays at the
    // viewport center at any zoom
    // camera: the world's top-left starts at the viewport center, then shifts
    // by -x/-y, so world point (x, y) lands in the center of the screen.
    // The outer div clips the 7000x10000 world to whatever box it's placed in
}
