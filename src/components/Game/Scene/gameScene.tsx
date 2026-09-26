'use client'

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react" // imports: **no PointerEvent** -> **+ PointerEvent**, reason: MobileGameScene merged in, mechanism: types the joystick/pinch handlers that moved here
import PlayerRenderer, { PlayerProps } from "../Entity/playerRenderer"
import EntityRenderer, { ENT_H, ENT_W, EntityProps } from "../Entity/entityRenderer" // imports: **ENT_H, ENT_W** -> **+ EntityRenderer, EntityProps**, mechanism: the scene draws the npcs prop itself
import ObjectRenderer from "../Object/ObjectRenderer"
import { HitBox, ObjectDef, PlacedObject, applyScale } from "../Object/gameObject"
import { OBJECTS } from "../Object/objects"


export type BGProps = {
    x: number,
    y: number,
    w: number,
    h: number,

    color: string,
    img?: string, // something not gameObject and no interfearance to entity: particles, leafs, grass, rain
}

export const BG_H = 10_000 // export: **local** -> **exported**, reason: MobileTester places test NPCs around the spawn point, mechanism: named export like BG_COLOR
export const BG_W = 7_000 // export: **local** -> **exported**, reason: same as BG_H
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

export const ZOOM_DEF = 1 // export: **local** -> **exported**, reason: the pinch starts its zoom ref here, mechanism: named export next to the default GameScene export
const ZOOM_MIN = 0.2
const ZOOM_MAX = 4

export const clampZoom = (z: number) => Math.min(Math.max(z, ZOOM_MIN), ZOOM_MAX)
// one place for the zoom limits, shared by the wheel and the pinch so both
// stop at the same min/max

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
// one wheel -> target zoom step for the scene's wheel listener (the stick
// overlay is inside the scene div now, so its wheel events bubble up to that
// one listener). preventDefault stops ctrl+wheel /
// trackpad pinch from zooming the page. deltaMode 1 (Firefox) reports
// lines, ~16px each. exp(-delta * rate) zooms by the same ratio per notch
// at any zoom level; wheel up (negative delta) zooms in

const RADIUS = 50 // css px the knob can travel from the base center
const DEADZONE = 0.15 // fraction of RADIUS treated as "not pushed"
const KNOB_SIZE = 44 // css px
// RADIUS sets both the drawn ring and how far a full push is; DEADZONE keeps
// a resting thumb's jitter from flipping the player's skew/rotate
export const SENSITIVITY_DEF = 1.3
// default stick sensitivity: a full push takes RADIUS / 1.3 ~= 42px of drag
// instead of 50, so the stick reaches full speed slightly sooner

type Stick = { base: { x: number, y: number }, knob: { x: number, y: number } }
// joystick constants/type: moved unchanged from MobileGameScene when it was
// merged in, so the touch controls are edited here with the rest of the scene

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

const NO_OBJECTS: PlacedObject[] = []
// default for the objects prop; module-level so it's the same array every
// render and the useMemo below doesn't redo its work each frame

export type SceneNPC = { ent: EntityProps, dialog?: string }
const NO_NPCS: SceneNPC[] = []
const STILL = { x: 0, y: 0 }
// an entity standing in the scene with an optional speech bubble. NO_NPCS /
// STILL are module-level so they're the same object every render; STILL is
// the velocity for NPCs that don't move yet (no lean, no gust)

const SIGN_RANGE = 16 // world px around a sign's hitBox where its text shows
const TALK_RANGE = 24 // world px around an NPC's body where its dialog shows
// NPCs are solid, so the closest the player gets is flush (gap 0); 24 px is
// about two body widths, near enough to read as "next to" them

const overlaps = (cx: number, cy: number, w: number, h: number, box: HitBox, pad = 0) =>
    cx - w / 2 < box.x + box.w + pad && cx + w / 2 > box.x - pad &&
    cy - h / 2 < box.y + box.h + pad && cy + h / 2 > box.y - pad
// entities are center-anchored (EntityRenderer's translate(-50%,-50%)) and
// solids are top-left world boxes, so the entity's edges are center ± half
// its size. Strict < / > lets the player stand flush against an edge
// without counting as inside it. pad grows the box (sign range)

const worldBox = (obj: PlacedObject, box: HitBox): HitBox =>
    ({ x: obj.x + box.x, y: obj.y + box.y, w: box.w, h: box.h })
// a def's hitBox is relative to the sprite's top-left; adding the
// placement's x/y turns it into world px for the checks above

export const objectHitBoxes = (objects: PlacedObject[]): HitBox[] => objects.flatMap(obj => {
    const base = OBJECTS[obj.def]
    const box = base && applyScale(base, obj.scale).hitBox
    return box ? [worldBox(obj, box)] : []
})
// the world-px hitBoxes of a map's objects, same lookup + scale + worldBox
// the scene's own solids use; unknown kinds and walk-through objects give
// none. Exported so callers (MobileTester's NPC spots) can keep clear of them

export default function GameScene({ bgProps = TEMP_BG, player = TEST_PLAYER, sensitivity = SENSITIVITY_DEF, objects = NO_OBJECTS, npcs = NO_NPCS }: { bgProps?: BGProps, player?: PlayerProps, screenSize?: { w: number, h: number }, sensitivity?: number, objects?: PlacedObject[], npcs?: SceneNPC[] }) { // props: **moveInput?, zoomInput?** -> **sensitivity?**, reason: MobileGameScene merged into GameScene so edits happen in one place, mechanism: the joystick and pinch live here now and write to the scene's own stickRef / zoomTarget, so no caller passes refs in; sensitivity is the one knob MobileGameScene had on top // props: **no npcs** -> **npcs?**, reason: entities with dialog in the scene, mechanism: each is drawn with EntityRenderer at its bottom-edge zIndex like the player; optional so a bare <GameScene /> has none // props: **no objects** -> **objects?**, reason: an island draws its map, mechanism: a PlacedObject list (island_N.ts) resolved against the OBJECTS catalog below; optional so a bare <GameScene /> is an empty field
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
    const zoomTarget = useRef<number>(ZOOM_DEF) // target: **zoomInput ?? own ref** -> **own ref**, reason: the pinch moved in here, mechanism: wheel and pinch both write this one ref
    // zoomRef = the zoom drawn this frame; zoomTarget = where the wheel/pinch
    // wants it. Both are stable ref objects, so the mount-time tick/wheel
    // closures stay current
    const stickRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 })
    const activeIdRef = useRef<number | null>(null)
    const [stick, setStick] = useState<Stick | null>(null)
    const pointersRef = useRef<Map<number, { x: number, y: number }>>(new Map())
    const pinchRef = useRef<{ dist0: number, zoom0: number } | null>(null)
    // stickRef is what the rAF tick reads (-1..1 per axis, length <= 1) -- a
    // ref so a move doesn't need a render to reach the loop. activeIdRef = the
    // one pointer driving the stick. stick is only for drawing the ring/knob;
    // null = nothing on screen. pointersRef = every finger currently down on
    // the scene, by pointerId. pinchRef = the finger distance and zoom when
    // the pinch started; null = not pinching
    const sceneRef = useRef<HTMLDivElement>(null)
    const sceneSizeRef = useRef<{ w: number, h: number }>({ w: 0, h: 0 })
    // on-screen size of the scene box in css px, measured below -- the
    // camera clamp needs it to know how much world is visible
    const placed = useMemo(() => objects.flatMap(obj => {
        const base: ObjectDef | undefined = OBJECTS[obj.def] // name: **def** -> **base**, mechanism: the catalog def before scaling, so `def` below is always the per-placement size
        if (!base) {
            console.warn(`object ${obj.id}: no '${obj.def}' in OBJECTS, skipped`)
            return []
        }
        const def = applyScale(base, obj.scale) // def: **catalog def** -> **applyScale(catalog def, obj.scale)**, mechanism: every later use (renderer size, zIndex, solids, sign range) reads this scaled copy, so they all agree on the drawn size
        return [{ obj, def, solid: def.hitBox && worldBox(obj, def.hitBox) }]
    }), [objects])
    const solidsRef = useRef<HitBox[]>([])
    solidsRef.current = [
        ...placed.flatMap(p => p.solid ? [p.solid] : []),
        ...npcs.map(n => ({ x: (n.ent.x ?? 0) - n.ent.w / 2, y: (n.ent.y ?? 0) - n.ent.h / 2, w: n.ent.w, h: n.ent.h })),
    ] // solids: **object hitBoxes** -> **+ each NPC's body**, reason: NPCs block the player, mechanism: an NPC is center-anchored, so center - half size is its top-left; the same overlaps() check in the tick stops the player at its edge
    // each placement paired with its catalog def, plus its hitBox in world
    // px (worked out once here, not every frame). A typo'd def is skipped
    // with a warning instead of crashing the island. solidsRef hands the
    // blocking boxes to the mount-time tick closure, same pattern as the
    // other refs
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
            const stick = stickRef.current // source: **moveInput?.current** -> **stickRef.current**, reason: the joystick moved in here, mechanism: same -1..1 vector, now from the scene's own ref
            const useStick = stick.x !== 0 || stick.y !== 0
            vel.x = (useStick ? stick.x : dx / len) * PLAYER_SPEED // input: **keys only** -> **stick while pushed, else keys**, reason: phones have no keyboard, mechanism: stick length <= 1 so a half push walks at half speed (analog); stickRef is a stable ref so reading it from this mount-time closure stays current
            vel.y = (useStick ? stick.y : dy / len) * PLAYER_SPEED // input: **keys only** -> **stick while pushed, else keys**, reason: same as vel.x, mechanism: same as vel.x
            // each axis is -1/0/1 (opposite keys cancel). Dividing by the
            // length makes diagonals the same speed as straight moves instead
            // of ~1.41x; `|| 1` avoids 0/0 when nothing is held. vel is
            // mutated in place, so PlayerRenderer (holding the same object)
            // sees the new signs for its skew/rotate

            const ent = playerRef.current.ent
            const bg = bgRef.current
            if (ent) {
                const x = ent.x ?? 0
                const y = ent.y ?? 0
                const nx = Math.min(Math.max(x + vel.x * dt, ent.w / 2), bg.w - ent.w / 2)
                if (!solidsRef.current.some(s => overlaps(nx, y, ent.w, ent.h, s))) ent.x = nx // move: **always** -> **only if the new x hits no hitBox**, mechanism: a blocked step is dropped, so the player stops at the object's edge
                const ny = Math.min(Math.max(y + vel.y * dt, ent.h / 2), bg.h - ent.h / 2)
                if (!solidsRef.current.some(s => overlaps(ent.x ?? x, ny, ent.w, ent.h, s))) ent.y = ny // move: **always** -> **only if the new y hits no hitBox**, mechanism: same as x
            }
            // x and y are tried separately, so pushing diagonally into a wall
            // still slides along it on the free axis. A step is at most
            // PLAYER_SPEED * MAX_DT = 12px, less than any hitBox, so the
            // player can't skip through one in a single frame
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
        const handleWheel = (e: WheelEvent) => wheelZoom(e, zoomTarget) // body: **inline wheel math** -> **wheelZoom helper**, mechanism: the math moved into wheelZoom above, unchanged
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
        if (activeIdRef.current !== null || pinchRef.current) return
        activeIdRef.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        const rect = e.currentTarget.getBoundingClientRect()
        const base = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        setStick({ base, knob: base })
    }
    // floating stick: the base appears wherever the thumb lands. A second
    // finger (or one landing mid-pinch) is ignored so it can't hijack the
    // stick. Pointer capture keeps move/up events coming to the overlay even
    // after the finger slides past its edge. Positions are overlay-local px
    // so they match the drawing below

    const handleMove = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerId !== activeIdRef.current || !stick || pinchRef.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        const dx = e.clientX - rect.left - stick.base.x
        const dy = e.clientY - rect.top - stick.base.y
        const dist = Math.hypot(dx, dy)
        const scale = dist > reach ? reach / dist : 1
        const cx = dx * scale
        const cy = dy * scale
        const push = Math.min(dist, reach) / reach
        stickRef.current = push < DEADZONE ? { x: 0, y: 0 } : { x: cx / reach, y: cy / reach }
        setStick({ base: stick.base, knob: { x: stick.base.x + cx, y: stick.base.y + cy } })
    }
    // the offset from the base is shrunk onto the ring when the thumb goes
    // past reach, so the knob stays on the edge and the vector's length
    // tops out at 1 (full speed). Inside the deadzone the output is 0, so
    // the tick falls back to the keyboard

    const fingerDist = () => {
        const [a, b] = [...pointersRef.current.values()]
        return Math.hypot(a.x - b.x, a.y - b.y)
    }

    const handlePinchDown = (e: PointerEvent<HTMLDivElement>) => {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pointersRef.current.size === 2) {
            pinchRef.current = { dist0: fingerDist() || 1, zoom0: zoomTarget.current }
            release()
        }
    }

    const handlePinchMove = (e: PointerEvent<HTMLDivElement>) => {
        if (!pointersRef.current.has(e.pointerId)) return
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const pinch = pinchRef.current
        if (pinch && pointersRef.current.size >= 2) {
            zoomTarget.current = clampZoom(pinch.zoom0 * fingerDist() / pinch.dist0)
        }
    }

    const handlePinchUp = (e: PointerEvent<HTMLDivElement>) => {
        pointersRef.current.delete(e.pointerId)
        if (pointersRef.current.size < 2) pinchRef.current = null
    }
    // these sit on the scene div, so pointer events from the stick overlay
    // bubble up to them and a pinch works anywhere. The second finger down
    // starts the pinch and releases the stick so the player stops. The zoom
    // target is the start zoom times how much the finger distance grew
    // (spread = in, pinch = out), in client px so it doesn't matter which
    // element each finger is over. || 1 avoids /0 if both land on one point.
    // Below two fingers the pinch ends and the leftover finger does nothing
    // until it lifts

    const bg = bgRef.current
    const pEnt = playerRef.current.ent
    const signs = pEnt ? placed.filter(p =>
        p.obj.interaction?.kind === 'sign' &&
        overlaps(pEnt.x ?? 0, pEnt.y ?? 0, pEnt.w, pEnt.h, p.solid ?? { x: p.obj.x, y: p.obj.y, w: p.def.sprite.w, h: p.def.sprite.h }, SIGN_RANGE)
    ) : []
    // signs the player is standing next to: within SIGN_RANGE of the hitBox,
    // or of the whole sprite for a walk-through sign. Worked out each render
    // (once per frame, force() in the tick) from the refs, so no extra state

    return (
        <div
            ref={sceneRef}
            onPointerDown={handlePinchDown}
            onPointerMove={handlePinchMove}
            onPointerUp={handlePinchUp}
            onPointerCancel={handlePinchUp}
            style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', touchAction: 'none' }} // scene div: **no pointer handlers, no touchAction** -> **pinch handlers + touchAction none**, reason: MobileGameScene's wrapper merged in, mechanism: the stick overlay is a child now, so its pointer events bubble here for the pinch, and touch-action none stops the browser's own pan/zoom on any touch starting in the scene
        >
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
                {placed.map(({ obj, def }) => <ObjectRenderer key={obj.id} obj={obj} def={def} />)}
                {/* objects, each with a zIndex of its bottom edge */}
                {/* entities go here, sized/positioned in world px (no zoom) */}
                <div style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((pEnt?.y ?? 0) + (pEnt?.h ?? ENT_H) / 2) }}> {/* wrap: **none** -> **0x0 div with the player's bottom-edge zIndex**, mechanism: ent.y is the center, so + h/2 is the feet; compared with ObjectRenderer's y + sprite.h the lower one draws in front. The wrapper is its own stacking context, so the name tag's zIndex 1 still only orders it against the body */}
                <PlayerRenderer velocity={velocityRef.current} maxSpeed={PLAYER_SPEED} player={playerRef.current} /> {/* props: **velocity, player** -> **+ maxSpeed**, reason: lean scales with how hard the stick is pushed, mechanism: PLAYER_SPEED is full speed, so vel.x / PLAYER_SPEED is the stick's x (or ±1 / ±0.71 on keys); passed as a prop because the renderers importing it from here would be a circular import */}
                </div>
                {npcs.map((n, i) => (
                    <div key={`npc-${i}`} style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((n.ent.y ?? 0) + n.ent.h / 2) }}>
                        <EntityRenderer velocity={STILL} ent={n.ent} dialog={pEnt && overlaps(pEnt.x ?? 0, pEnt.y ?? 0, pEnt.w, pEnt.h, { x: (n.ent.x ?? 0) - n.ent.w / 2, y: (n.ent.y ?? 0) - n.ent.h / 2, w: n.ent.w, h: n.ent.h }, TALK_RANGE) ? n.dialog : undefined} /> {/* dialog: **always n.dialog** -> **n.dialog only near the player**, mechanism: same overlaps check as signs, on the NPC's body box grown by TALK_RANGE; out of range passes undefined, which EntityRenderer draws as no bubble. Re-checked every frame since force() re-renders each tick */}
                    </div>
                ))}
                {/* NPCs: same 0x0 bottom-edge zIndex wrapper as the player, so
                    they sort against objects and the player by their feet. Their
                    bodies are in solidsRef, so they block the player */}
                {/* reads straight from the refs; force() re-renders every frame,
                    so ref mutations in the tick show up on the next frame */}
                {signs.map(({ obj, def, solid }) => {
                    const box = solid ?? { x: obj.x, y: obj.y, w: def.sprite.w, h: def.sprite.h }
                    return obj.interaction?.kind === 'sign' && (
                        <div
                            key={`sign-${obj.id}`}
                            style={{
                                position: 'absolute',
                                left: box.x + box.w / 2,
                                top: box.y - 4,
                                transform: 'translate(-50%, -100%)',
                                zIndex: bg.h + 1,
                                padding: '2px 6px',
                                maxWidth: 160,
                                width: 'max-content',
                                fontSize: 10,
                                lineHeight: 1.3,
                                color: '#222',
                                background: 'rgba(255, 255, 255, 0.92)',
                                border: '1px solid #222',
                                borderRadius: 4,
                                pointerEvents: 'none',
                            }}
                        >
                            {obj.interaction.text}
                        </div>
                    )
                })}
                {/* sign bubble: centered just above the hitBox (the tower's
                    foot, where the player is standing), bottom-anchored by
                    translate -100%. zIndex bg.h + 1 is above every bottom-edge
                    zIndex, since those are all <= bg.h. World px like the rest,
                    so it scales with the zoom */}
            </div>
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
                    width: '100%',
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
                            left: stick.base.x - reach,
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
            {/* stick overlay: moved in from MobileGameScene. It covers the
                whole scene above the world (zIndex 1; the world's transform
                gives it its own stacking context, so nothing inside can poke
                through), so the stick can start anywhere; future on-screen
                buttons need a higher zIndex to get taps. Being inside the
                scene div, its wheel events bubble to the one wheel listener
                above and its pointer events to the pinch handlers. userSelect
                none stops a long press from selecting text. Ring and knob are
                centered on their points and have pointerEvents none so they
                never steal the drag */}
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
