'use client'

import { PointerEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react" // imports: **no PointerEvent** -> **+ PointerEvent**, reason: MobileGameScene merged in, mechanism: types the joystick/pinch handlers that moved here
import PlayerRenderer, { PlayerProps } from "../Entity/playerRenderer"
import FootPrintRenderer from "../Entity/footPrintRenderer"
import { ENT_H, ENT_W } from "../Entity/entityRenderer" // imports: **ENT_H, ENT_W, EntityRenderer, EntityProps** -> **ENT_H, ENT_W**, reason: NPCs draw through NPCRenderer now, mechanism: NPCProps carries the EntityProps, so neither is used here
import NPCRenderer, { NPCProps, NPC_TAP_ATTR, pickDialog, talkLines } from "../Entity/npcRenderer" // imports: **+ pickDialog**, mechanism: reads the talk's choices
import { dialogUrl, preloadClips } from "../Entity/voice"
// voice preload: the scene decodes its NPC lines up front (see voiceUrls)
import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W, CHOICE_TAP_ATTR } from "../Entity/dialogBubble" // imports: **CHOICE_TAP_ATTR** -> **+ BUBBLE_BG**, mechanism: QUEST_BG ground color // imports: **+ BUBBLE_BOARDER, BUBBLE_BORDER_W**, mechanism: the border BGProps.border draws
import ObjectRenderer from "../Object/ObjectRenderer"
import { HitBox, ObjectDef, PlacedObject, applyScale } from "../Object/gameObject"
import { OBJECTS } from "../Object/objects"
import MuteButton from "./MuteButton"
// mute toggle drawn over the scene (see the end of the render)


export type BgSection = {
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,

    color: string,
    tile?: string,
    merge?: boolean,
    // merge: this section's tile reaches up over its top border in an uneven,
    // dithered strip (MERGE_H tall), so the two soils mix. Needs a section
    // above it. With no tile the strip is the section's plain color. Full-width top borders only
    solid?: boolean,
    // solid: the player can't walk onto this section (water). Its rectangle
    // is added to the scene's blocking boxes, like an object's hitBox. With
    // merge, the box starts SHORE_IN px above the section's top, inside the
    // merge strip, so the player stops in the loose pixels of the shore and
    // not on the full color below them
    wave?: boolean,
    // wave: the section and its merge strip move up and back down like a
    // wave (WAVE_RISE px over WAVE_PERIOD s). A solid wave section's blocking
    // box moves with it and pushes a player it reaches up the shore
}
// one rectangle of ground inside the world, in world px from the world's
// top-left (x, y = the rectangle's top-left corner, unlike BGProps where
// x, y is the center). color fills it; tile is a repeating image drawn over
// the color (a 64 px file from python/sprite.py `tile`, in public/img/bg/)

export type BGProps = {
    x: number,
    y: number,
    w: number,
    h: number,

    color: string,
    img?: string, // something not gameObject and no interfearance to entity: particles, leafs, grass, rain
    sections?: BgSection[],
    // ground areas drawn over color and under every object and entity. None
    // = the whole world is the one flat color, as before
    border?: boolean, // border: **none** -> **optional**, reason: the Quest Island has a black square edge like DialogBubble, mechanism: the world div draws BUBBLE_BORDER_W of BUBBLE_BOARDER inside its box (border-box), so the playable size stays w x h
}

export const BG_H = 2_000 // size: **10_000** -> **2_000**, reason: every island is the same 1400 x 2000 world, mechanism: TEMP_BG, islandBg and the TEST_PLAYER spawn all derive from BG_W / BG_H // export: **local** -> **exported**, reason: MobileTester places test NPCs around the spawn point, mechanism: named export like BG_COLOR
export const BG_W = 1_400 // size: **7_000** -> **1_400**, mechanism: see BG_H // export: **local** -> **exported**, reason: same as BG_H
export const BG_COLOR = 'lightgreen' // export: **local** -> **exported**, reason: Game/layout.tsx paints the page background with it, mechanism: named export next to the default GameScene export, same as ZOOM_DEF

const TEMP_BG: BGProps = {
    x: BG_W / 2,
    y: BG_H / 2,
    w: BG_W,
    h: BG_H,
    color: BG_COLOR
}

const SECTION_TILE_PX = 256
// world px one ground tile covers: the 64 px tile file drawn 4x, the same
// 4 world px per art pixel as the object sprites
const MERGE_MASK = '/img/bg/merge.webp'
const MERGE_H = 160
const MERGE_SHIFT = 388
const SHORE_IN = 85 // SHORE_IN: **40** -> **85**, mechanism: the blocking box of the water starts 45 px higher, so the player stops further up the shore, above the loose water pixels
// world px a solid merged section's blocking box reaches up into its merge
// strip: about where the mask's wavy full part starts, so the player's feet
// stop at the water's edge
const WAVE_RISE = 40
const WAVE_PERIOD = 4
const WAVE_STEP = 4
const waveOffset = (now: number) => Math.round(-WAVE_RISE * (1 - Math.cos((now / 1000) * 2 * Math.PI / WAVE_PERIOD)) / 2 / WAVE_STEP) * WAVE_STEP
// the wave of a section with wave: true. waveOffset gives its y offset in
// world px at a time `now` (ms, the animation frame clock): 0 at rest, down
// to -WAVE_RISE at the top of the wave, and back, once every WAVE_PERIOD
// seconds. (1 - cos) / 2 runs 0..1..0 and is slow at both ends, like water
// that stops before it turns. The section's own place is the lowest point,
// so the water only comes up over the sand and never uncovers the ground
// below its top. The result is rounded to WAVE_STEP (one art pixel, 4 world
// px), so the shore moves on the pixel grid
// the merge strip of a section border. MERGE_MASK is the shape made by
// python/sprite.py `merge` (1024 x 160, white with alpha 0 or 255: full at
// the bottom, loose pixels toward the top); MERGE_H is its height, printed
// by that command. MERGE_SHIFT moves the mask left by this many world px
// for each next merged border, so two borders do not show the same line; it
// is a multiple of 4, so the mask's pixels stay on the 4 px art grid

export const ISLAND_COUNT = 5
export const ISLAND_BG: Record<number, string> = {
    1: 'lightgreen',
    2: '#f5e8a0', // color: **yellow** -> **#f5e8a0**, mechanism: pastel yellow, same softness as lightgreen
    3: '#a9d4f0', // color: **blue** -> **#a9d4f0**, mechanism: pastel blue
    4: '#cdb8e8', // color: **purple** -> **#cdb8e8**, mechanism: lavender
    5: '#f2aaa2', // color: **red** -> **#f2aaa2**, mechanism: pastel red
}
export const ISLAND_SECTIONS: Record<number, BgSection[]> = {
    2: [
        { id: 'volcano', x: 0, y: 0, w: 1400, h: 500, color: '#8f4a36' }, // color, tile: **#853d2a, /img/bg/red-rock.webp** -> **#8f4a36, none**, mechanism: the ground is one plain color (red-brown), no texture; with no tile the section div shows only its backgroundColor
        { id: 'forest', x: 0, y: 500, w: 1400, h: 400, color: '#a9cf7a', merge: true }, // color, tile: **#46591d, /img/bg/moss.webp** -> **#a9cf7a, none**, mechanism: same as volcano (light green); merge stays, so the green reaches up over the volcano border
        { id: 'beach', x: 0, y: 900, w: 1400, h: 800, color: '#f3e9c6', merge: true }, // color, tile: **#cdad87, /img/bg/sand.webp** -> **#f3e9c6, none**, mechanism: same as volcano (off-white, a bit yellow); merge stays, so the sand reaches up over the forest border // h: **1100** -> **800**, mechanism: the bottom 300 px of the world is the ocean section now
        { id: 'ocean', x: 0, y: 1700, w: 1400, h: 300, color: '#87ceeb', merge: true, solid: true, wave: true }, // solid: **none** -> **true**, mechanism: the ocean's rectangle joins the blocking boxes, so the player stops at the shore // wave: **none** -> **true**, mechanism: the water and its shore move up and down, and the blocking box with them
        // the ocean below the sand: one plain sky blue band over the bottom
        // 300 px of the world. merge makes the blue reach up over the sand's
        // bottom edge through the mask, so the shore is an uneven, dithered
        // line like the other borders
    ],
} // sections: **{}** -> **island 2's three sections**, mechanism: the tropical-island scene (docs/scenes/tropical-island.md): three full-width bands that cover the 1400 x 2000 world top to bottom; each is one plain color with no tile (moss light green, sand off-white and a bit yellow, volcano sand red-brown)
// the ground sections of each island, keyed by island id. The /make-scene
// skill adds an island's entry when it builds that scene. An island with no
// entry keeps its flat ISLAND_BG color

export const islandBg = (islandId: number): BGProps => ({ ...TEMP_BG, color: ISLAND_BG[islandId] ?? BG_COLOR, sections: ISLAND_SECTIONS[islandId] }) // sections: **none** -> **ISLAND_SECTIONS[islandId]**, mechanism: the island's ground sections ride along in BGProps; undefined for an island with no entry, so GameScene draws nothing extra
// islands 1..ISLAND_COUNT share the same size and differ only by ground
// color; islandBg is TEMP_BG recolored for one island (unknown id falls
// back to BG_COLOR). GameScene reads bgProps once at mount, so callers
// switching islands remount it with key={islandId}

export const questBg = (w: number, h: number): BGProps => ({ x: w / 2, y: h / 4 + 300, w, h, color: BUBBLE_BG, border: true }) // QUEST_BG: **fixed 1000 x 700 const** -> **questBg(w, h)**, reason: the island is 2x the screen, mechanism: the caller measures the window and passes the size; color is BUBBLE_BG ('#fffff2') and border: true draws the bubble's black edge
// the Quest Island a quest opens on, painted the dialog bubble's bg color.
// x/y is where the player spawns and the camera starts // spawn: **island center (h / 2)** -> **bottom middle (h - 80)**, reason: Ryuuko throws from the top middle, mechanism: bgProps.x/y is only read as the player's spawn and the camera's start, so moving it moves just those // spawn: **bottom middle (h - 80)** -> **partway up (h * 3 / 4)**, reason: the walk to Ryuuko was ~25s, mechanism: half the island (one screen) below her at h / 4, about a 7s walk // spawn: **h * 3 / 4** -> **h / 4 + 300**, reason: arrive 300px from Ryuuko, mechanism: h / 4 is her y (throwSpot), so the player starts 300px straight below her; throwSpot isn't imported here since training.ts already imports gameScene

// longest frame interval (seconds) one tick will simulate
const MAX_DT = 1 / 10
// rAF pauses in background tabs, so the first frame back can report a
// multi-second gap -- clamping stops everything from teleporting

type SceneProps = {
    backGround: BGProps,

}

export const ZOOM_DEF = 1 // export: **local** -> **exported**, reason: the pinch starts its zoom ref here, mechanism: named export next to the default GameScene export
const ZOOM_MIN = 0.5
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
const TAP_MS = 200
const TAP_PX = 10
// a stick press shorter than TAP_MS that moved less than TAP_PX (screen px)
// is a tap: it shoots (when onShoot is set) instead of only walking
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
const SPRINT = 1.5
// speed multiplier while Shift (either side) is held
const STICK_SPRINT_PUSH = 0.99
// stick length that counts as max tilt: the knob is clamped to the ring, so a
// full push is exactly 1; 0.99 absorbs float rounding at the edge

const TEST_PLAYER: PlayerProps = { // in final will be made from db User info
    name: 'Player',
    ent: { // spawn: **x: BG_W / 2, y: BG_H / 2** -> **no x/y**, reason: the 1000 x 700 Quest Island center is not the island's, mechanism: playerRef fills the spawn from bgProps.x/y
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

export type SceneNPC = NPCProps // type: **{ ent, dialog?: string }** -> **NPCProps**, reason: NPCs talk in several lines now, mechanism: NPCProps is { ent, dialog?: Dialog[], quest? }, defined next to NPCRenderer that draws it
const NO_NPCS: SceneNPC[] = []
const STILL = { x: 0, y: 0 }
// an entity standing in the scene with an optional speech bubble. NO_NPCS /
// STILL are module-level so they're the same object every render; STILL is
// the velocity for NPCs that don't move yet (no lean, no gust)

const SIGN_RANGE = 16 // world px around a sign's hitBox where its text shows
const TALK_RANGE = 24 // world px around an NPC's body where its dialog shows
// NPCs are solid, so the closest the player gets is flush (gap 0); 24 px is
// about two body widths, near enough to read as "next to" them

const TALK_ZOOM = 3 // zoom while talking to an NPC
const TALK_SETTLE_ZOOM = 0.05 // how close to TALK_ZOOM counts as zoomed in
const TALK_SETTLE_DIST = 2 // world px: how close the camera must be to the NPC
// a talk shows its first line only once the zoom and camera have (nearly)
// arrived, so the lines start after the zoom-in like the spec says. The
// ease never quite reaches its target, hence the tolerances

type Talk = { i: number, line: number, savedZoom: number }
// i = index of the NPC being talked to, line = the talk line shown,
// savedZoom = the zoom target before the talk, restored when it ends

export const overlaps = (cx: number, cy: number, w: number, h: number, box: HitBox, pad = 0) =>
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

export type PlayerBox = { x: number, y: number, w: number, h: number }
// the player's center + size handed to onTick, same shape overlaps() reads

export default function GameScene({ bgProps = TEMP_BG, player = TEST_PLAYER, sensitivity = SENSITIVITY_DEF, objects = NO_OBJECTS, npcs = NO_NPCS, onQuest, onChoice, onTalkEnd, onTick, renderWorld, talkRequest, moveRequest, wallY, playerLabel, onShoot }: { bgProps?: BGProps, player?: PlayerProps, screenSize?: { w: number, h: number }, sensitivity?: number, objects?: PlacedObject[], npcs?: SceneNPC[], onQuest?: (npc: number) => void, onChoice?: (npc: number, choice: number) => void, onTalkEnd?: (npc: number) => void, onTick?: (dt: number, player: PlayerBox) => void, renderWorld?: () => ReactNode, talkRequest?: { npc: number, key: number }, moveRequest?: { x: number, y: number, key: number }, wallY?: number, playerLabel?: () => string | undefined, onShoot?: () => boolean }) { // props: **no onShoot** -> **onShoot?**, reason: the shooting quest copy fires bullets with Space / a tap, mechanism: returns true when it fired; Space falls back to talking and taps to the stick / pinch when it returns false or is unset, so every other caller is unchanged // props: **no playerLabel** -> **playerLabel?**, reason: Quest Island shows current/quota over the player, mechanism: called every render (the scene force()-renders each frame) and its string replaces the name tag; undefined keeps the real name // props: **no onChoice / onTick / renderWorld / talkRequest** -> **optional hooks**, reason: the Quest Island runs a minigame on top of the scene, mechanism: onChoice gets every choice tap (npc index, choice index), onTick runs each frame after the player moves, renderWorld draws extra world-px children, talkRequest opens a talk with an NPC when its key changes; islands pass none, so they behave as before // props: **no onQuest** -> **onQuest?**, reason: NPCs offer the island's next quest, mechanism: called when the player picks choice 0 (はい); left out = no quest open, so NPCs skip their 'quest' entry // props: **moveInput?, zoomInput?** -> **sensitivity?**, reason: MobileGameScene merged into GameScene so edits happen in one place, mechanism: the joystick and pinch live here now and write to the scene's own stickRef / zoomTarget, so no caller passes refs in; sensitivity is the one knob MobileGameScene had on top // props: **no npcs** -> **npcs?**, reason: entities with dialog in the scene, mechanism: each is drawn with EntityRenderer at its bottom-edge zIndex like the player; optional so a bare <GameScene /> has none // props: **no objects** -> **objects?**, reason: an island draws its map, mechanism: a PlacedObject list (island_N.ts) resolved against the OBJECTS catalog below; optional so a bare <GameScene /> is an empty field // props: **no onTalkEnd** -> **onTalkEnd?**, reason: the Quest Island moves on after a talk without choices (Ryuuko's おつかれさま！), mechanism: endTalk calls it with the NPC index, before onChoice on a choice tap // props: **no wallY** -> **wallY?**, reason: during Quest Island training the player could stand next to Ryuuko and catch every block, mechanism: a world-px y the player's top edge can't go above, applied in the tick's y clamp; undefined = no wall
    // props are optional (?) because they have defaults -- lets a page mount
    // a bare <GameScene /> while the db-backed bg/player aren't wired yet.
    // screenSize has no default and isn't read yet, so it's undefined for now

    const [, force] = useState<number>(0)

    const playerRef = useRef<PlayerProps>({ ...player, ent: player.ent && { ...player.ent, x: player.ent.x ?? bgProps.x, y: player.ent.y ?? bgProps.y } }) // ent: **{ ...player.ent }** -> **+ x/y ?? bgProps.x/y**, mechanism: a player without a spot spawns at its world's center, so every scene size spawns inside its own bounds
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
        ...(bgProps.sections ?? []).filter(sec => sec.solid && !sec.wave).map(sec => { // filter: **sec.solid** -> **sec.solid && !sec.wave**, mechanism: a wave section's box moves every frame, so it is kept apart in waveBoxesRef and placed by the tick
            const up = sec.merge ? SHORE_IN : 0
            return { x: sec.x, y: sec.y - up, w: sec.w, h: sec.h + up }
        }),
        // solid ground sections (water) block like an object: the section's
        // own rectangle, grown upward by SHORE_IN when its border is merged.
        // The same overlaps() check in the tick stops the player at its edge
    ] // solids: **object hitBoxes** -> **+ each NPC's body**, reason: NPCs block the player, mechanism: an NPC is center-anchored, so center - half size is its top-left; the same overlaps() check in the tick stops the player at its edge
    const waveBoxesRef = useRef<HitBox[]>([])
    waveBoxesRef.current = (bgProps.sections ?? []).filter(sec => sec.solid && sec.wave).map(sec => {
        const up = sec.merge ? SHORE_IN : 0
        return { x: sec.x, y: sec.y - up, w: sec.w, h: sec.h + up }
    })
    const waveRef = useRef(0)
    // the blocking boxes of solid wave sections at rest (the same rectangle
    // a still solid section gets), and the wave's current y offset. The tick
    // writes waveRef each frame and shifts these boxes by it; the render
    // reads waveRef to draw the water at the same place
    // each placement paired with its catalog def, plus its hitBox in world
    // px (worked out once here, not every frame). A typo'd def is skipped
    // with a warning instead of crashing the island. solidsRef hands the
    // blocking boxes to the mount-time tick closure, same pattern as the
    // other refs
    const talkRef = useRef<Talk | null>(null)
    const npcsRef = useRef<SceneNPC[]>(npcs)
    npcsRef.current = npcs
    const voiceUrls = npcs.flatMap(n => n.voice ? (n.dialog ?? []).flatMap(d => [d.audio ?? []].flat().filter(Boolean).map(f => dialogUrl(n.voice!, f))) : []).join('\n')
    useEffect(() => { if (voiceUrls) preloadClips(voiceUrls.split('\n')) }, [voiceUrls])
    // preloads every voice line of this scene's NPCs: the same url rule as
    // NPCRenderer (dialogUrl(npc.voice, file) per non-empty audio entry).
    // The urls are joined into one string so the effect only re-runs when
    // the set of lines changes (a quest phase swapping dialogs), not on the
    // fresh npcs array each render; preloadClips skips urls it already has
    const spokenRef = useRef(new Set<number>())
    const spaceRef = useRef<() => void>(() => {})
    // spaceRef: the latest pressSpace (set each render below) for the
    // mount-time keydown listener
    // spokenRef: indexes of NPCs talked to (to the end) in this scene, so
    // their 'spoken' Dialog plays next time. Per-scene memory only, not saved
    // talkRef: null = not talking. A ref, like the other scene state, so the
    // mount-time tick reads it; the per-frame render shows its changes.
    // npcsRef hands the latest npcs prop to the tick for the camera target
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
            const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight') || (useStick && Math.hypot(stick.x, stick.y) >= STICK_SPRINT_PUSH)
            const speed = PLAYER_SPEED * (sprinting ? SPRINT : 1) // sprint: **Shift only** -> **Shift or stick at max tilt**, reason: phones have no Shift, mechanism: the stick vector's length hits 1 when the knob sits on the ring, so pushing to the edge jumps to SPRINT; below that it stays analog 0..1x
            // Shift sprints: keys holds e.code, so ShiftLeft / ShiftRight are
            // already tracked by the keydown/keyup listeners; applies to the
            // stick too when a keyboard is attached
            vel.x = (useStick ? stick.x : dx / len) * speed // speed: **PLAYER_SPEED** -> **speed**, mechanism: PLAYER_SPEED x SPRINT while Shift is held // input: **keys only** -> **stick while pushed, else keys**, reason: phones have no keyboard, mechanism: stick length <= 1 so a half push walks at half speed (analog); stickRef is a stable ref so reading it from this mount-time closure stays current
            vel.y = (useStick ? stick.y : dy / len) * speed // speed: **PLAYER_SPEED** -> **speed**, mechanism: same as vel.x // input: **keys only** -> **stick while pushed, else keys**, reason: same as vel.x, mechanism: same as vel.x
            const talk = talkRef.current
            const talkEnt = talk && npcsRef.current[talk.i]?.ent
            if (talk) {
                vel.x = 0
                vel.y = 0
                zoomTarget.current = TALK_ZOOM
            }
            // talking freezes the player: vel 0 ignores both the stick and the
            // keys (and stops the lean/gust), and the zoom target is pinned
            // to TALK_ZOOM each frame so a wheel/pinch can't pull it away
            // each axis is -1/0/1 (opposite keys cancel). Dividing by the
            // length makes diagonals the same speed as straight moves instead
            // of ~1.41x; `|| 1` avoids 0/0 when nothing is held. vel is
            // mutated in place, so PlayerRenderer (holding the same object)
            // sees the new signs for its skew/rotate

            const ent = playerRef.current.ent
            const bg = bgRef.current
            const wave = waveBoxesRef.current.length ? waveOffset(now) : 0
            waveRef.current = wave
            const waveBoxes = waveBoxesRef.current.map(b => ({ ...b, y: b.y + wave, h: b.h - wave }))
            const solids = waveBoxes.length ? [...solidsRef.current, ...waveBoxes] : solidsRef.current
            // the wave: one offset for this frame, and each wave box moved
            // up by it (the top rises, the bottom stays). solids is the
            // still boxes plus the moved ones, so walking into the water is
            // blocked at where the shore is now
            if (ent) {
                const x = ent.x ?? 0
                const y = ent.y ?? 0
                const nx = Math.min(Math.max(x + vel.x * dt, ent.w / 2), bg.w - ent.w / 2)
                if (!solids.some(s => overlaps(nx, y, ent.w, ent.h, s) && !overlaps(x, y, ent.w, ent.h, s))) ent.x = nx // move: **always** -> **only if the new x hits no hitBox**, mechanism: a blocked step is dropped, so the player stops at the object's edge // block: **any hitBox at the new x** -> **only one the player isn't already inside**, reason: Quest Island NPCs appear mid-game and can spawn on top of the player, mechanism: a box already overlapping doesn't block, so the player can walk out of it instead of freezing
                const ny = Math.min(Math.max(y + vel.y * dt, (wallYRef.current ?? 0) + ent.h / 2), bg.h - ent.h / 2) // top: **ent.h / 2** -> **wallY + ent.h / 2**, mechanism: with a wall the lowest allowed center moves down to it, so the player's top edge stops at the line; no wall = 0, the world's top as before
                if (!solids.some(s => overlaps(ent.x ?? x, ny, ent.w, ent.h, s) && !overlaps(ent.x ?? x, y, ent.w, ent.h, s))) ent.y = ny // move: **always** -> **only if the new y hits no hitBox**, mechanism: same as x // block: **any hitBox** -> **one not already overlapped**, mechanism: same as x
                for (const b of waveBoxes) {
                    if (overlaps(ent.x ?? 0, ent.y ?? 0, ent.w, ent.h, b)) ent.y = Math.max(b.y - ent.h / 2, ent.h / 2)
                }
                // the wave pushes: when a rising wave box reaches the player,
                // the player's center is set so the feet sit on the box's top
                // edge, and the player rides up the shore with the water.
                // When the water goes back down the player stays where they
                // were left. Not below ent.h / 2, the top of the world
                onTickRef.current?.(dt, { x: ent.x ?? 0, y: ent.y ?? 0, w: ent.w, h: ent.h })
            }
            // onTick: the minigame hook (Quest Island training) runs here, after
            // the player moved, with the same clamped dt, so its blocks share
            // the scene's clock. Read through a ref because this tick is set up
            // once at mount
            // x and y are tried separately, so pushing diagonally into a wall
            // still slides along it on the free axis. A step is at most
            // PLAYER_SPEED * SPRINT * MAX_DT = 18px, so a hitBox thinner than
            // that could be skipped in one very slow frame while sprinting // step: **12px** -> **18px**, mechanism: Shift raises the top speed 1.5x
            // position += velocity * dt keeps speed the same at any frame
            // rate; clamped to 0..bg.w/h so the player can't leave the world

            const view = viewPortRef.current
            const follow = 1 - Math.pow(1 - VIEWPORT_FOLLOW_RATE, dt * 60)
            const focus = talkEnt ? { x: talkEnt.x ?? 0, y: (talkEnt.y ?? 0) - talkEnt.h } : ent // target: **player** -> **talking NPC, else player**, reason: a selected NPC zooms in on it, mechanism: same easing, only the point it eases to changes; one body height up so the bubble above the head fits in the zoomed view too
            view.x += ((focus?.x ?? view.x) - view.x) * follow
            view.y += ((focus?.y ?? view.y) - view.y) * follow
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
            if (e.code === 'Space') { // Space: **none** -> **talk key**, reason: talk/advance NPC dialogs from the keyboard, mechanism: calls the latest pressSpace through spaceRef (this listener is mount-time, so a direct call would read stale props); preventDefault stops the page scroll / a focused button's click, e.repeat drops the auto-repeat of a held key so one press = one line
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
                e.preventDefault()
                if (!e.repeat && !onShootRef.current?.()) spaceRef.current() // Space: **always talk** -> **shoot first**, mechanism: onShoot returns false (or is unset) outside a level, so Space still talks there
                return
            }
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

    const talkReady = () => {
        const talk = talkRef.current
        const n = talk && npcs[talk.i]
        if (!n) return false
        const view = viewPortRef.current
        const bg = bgRef.current
        const halfW = sceneSizeRef.current.w / 2 / zoomRef.current
        const halfH = sceneSizeRef.current.h / 2 / zoomRef.current
        const fx = bg.w <= halfW * 2 ? bg.w / 2 : Math.min(Math.max(n.ent.x ?? 0, halfW), bg.w - halfW) // focus: **NPC head** -> **NPC head clamped like the camera**, reason: an NPC at the world edge never settled (seeded spots reach the edges), so its talk froze with no bubble, mechanism: the same clamp the tick applies to view, so the target is a point the camera can actually reach
        const fy = bg.h <= halfH * 2 ? bg.h / 2 : Math.min(Math.max((n.ent.y ?? 0) - n.ent.h, halfH), bg.h - halfH)
        return Math.abs(zoomRef.current - TALK_ZOOM) < TALK_SETTLE_ZOOM &&
            Math.hypot(view.x - fx, view.y - fy) < TALK_SETTLE_DIST
    }
    // true once the talk zoom-in has arrived: the zoom is at TALK_ZOOM and the
    // camera on the same focus point the tick eases to, clamped the way the
    // tick clamps the view so an NPC at the world edge still settles

    const tappedNpc = (clientX: number, clientY: number) => {
        const hit = Array.from(sceneRef.current?.querySelectorAll(`[${NPC_TAP_ATTR}]`) ?? []).find(el => {
            const r = el.getBoundingClientRect()
            return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
        })
        return hit ? Number(hit.getAttribute(NPC_TAP_ATTR)) : null
    }
    // index of the NPC whose body or bubble is under the tap, or null. The
    // overlay covers the world, so this checks the tagged elements' on-screen
    // rects (already scaled by the zoom) instead of waiting for their events

    const tappedChoice = (clientX: number, clientY: number) => {
        const hit = Array.from(sceneRef.current?.querySelectorAll(`[${CHOICE_TAP_ATTR}]`) ?? []).find(el => {
            const r = el.getBoundingClientRect()
            return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
        })
        return hit ? Number(hit.getAttribute(CHOICE_TAP_ATTR)) : null
    }
    // index of the dialog choice button under the tap, or null; same rect
    // test as tappedNpc (the buttons only exist once DialogBubble shows them)

    const questOpen = !!onQuest || !!onChoice // questOpen: **!!onQuest** -> **+ !!onChoice**, reason: the Quest Island answers choices through onChoice only, mechanism: either hook means someone listens to はい / いいえ, so NPCs play their 'quest' entry

    const endTalk = (talk: { i: number, savedZoom: number }) => {
        zoomTarget.current = talk.savedZoom
        talkRef.current = null
        spokenRef.current.add(talk.i) // spoken: **none** -> **marked when a talk ends**, mechanism: added after the last line, not at the start, so the picked entry doesn't switch mid-talk
        onTalkEnd?.(talk.i) // end: **silent** -> **onTalkEnd(npc)**, mechanism: every way a talk ends goes through here, so the parent hears about it once
    }
    // restores the saved zoom and ends the talk; shared by the last-line tap
    // and the choice buttons

    const startTalk = (i: number) => {
        talkRef.current = { i, line: 0, savedZoom: zoomTarget.current }
        release()
    }
    // opens a talk with NPC i from line 0, saving the zoom to go back to and
    // letting go of the stick so the player stops. Shared by pressSpace,
    // tapNpc and talkRequest

    useEffect(() => {
        if (talkRequest && npcs[talkRequest.npc]) startTalk(talkRequest.npc)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [talkRequest?.key])
    // talkRequest: a parent opens a talk without the player walking over
    // (Ryuuko's level-up lines, the fail prompt). Keyed so the same NPC can
    // be requested again; runs after the render that brought the new npcs in

    useEffect(() => {
        const ent = playerRef.current.ent
        if (!moveRequest || !ent) return
        ent.x = moveRequest.x
        ent.y = moveRequest.y
        velocityRef.current.x = 0
        velocityRef.current.y = 0
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [moveRequest?.key])
    // moveRequest: a parent places the player at a world-px center (Quest
    // Island puts them 350px below Ryuuko when a level starts). Keyed like
    // talkRequest so the same spot can be requested again. Mutates the ent
    // the rAF tick reads, so the next frame moves from there and the camera
    // follows it; velocity is zeroed so no leftover drift carries over

    const onTickRef = useRef(onTick)
    onTickRef.current = onTick
    const onShootRef = useRef(onShoot)
    onShootRef.current = onShoot
    const tapRef = useRef<{ t: number, x: number, y: number } | null>(null)
    // onShootRef: latest onShoot for the mount-time key listener. tapRef: when
    // and where the stick's finger went down, so its release can tell a quick
    // tap (shoot) from a hold / drag (walk)
    const wallYRef = useRef(wallY)
    wallYRef.current = wallY
    // latest wallY for the mount-time rAF tick, same as onTick
    // latest onTick for the mount-time rAF tick

    const nearNpc = (n: SceneNPC) => {
        const p = playerRef.current.ent
        return !!p && overlaps(p.x ?? 0, p.y ?? 0, p.w, p.h, { x: (n.ent.x ?? 0) - n.ent.w / 2, y: (n.ent.y ?? 0) - n.ent.h / 2, w: n.ent.w, h: n.ent.h }, TALK_RANGE)
    }
    // true when the player is within TALK_RANGE of the NPC's body: the check
    // that shows the greeting bubble, shared by the render and pressSpace

    const pressSpace = () => {
        const talk = talkRef.current
        if (talk) {
            if (!talkReady()) return
            const spoken = spokenRef.current.has(talk.i)
            const last = talk.line + 1 >= talkLines(npcs[talk.i], spoken, questOpen).length
            if (last && pickDialog(npcs[talk.i], spoken, questOpen).choices?.length) return
            if (!last) talkRef.current = { ...talk, line: talk.line + 1 }
            else endTalk(talk)
            return
        }
        const p = playerRef.current.ent
        let hit: number | null = null
        let best = Infinity
        npcs.forEach((n, i) => {
            const d = Math.hypot((n.ent.x ?? 0) - (p?.x ?? 0), (n.ent.y ?? 0) - (p?.y ?? 0))
            if (nearNpc(n) && d < best) { hit = i; best = d }
        })
        if (hit === null) return
        startTalk(hit) // start: **inline talkRef + release** -> **startTalk(hit)**, mechanism: same two steps, shared with tapNpc and talkRequest
    }
    spaceRef.current = pressSpace
    // keyboard twin of tapNpc. Not talking: starts a talk with the in-range
    // NPC (the nearest if several are). Talking: once the zoom-in settles,
    // shows the next line or ends after the last one. On a last line with
    // choices it does nothing -- はい / いいえ are clicked, never picked by Space.
    // Reassigned every render so the mount-time key listener calls the
    // version with the current npcs / onQuest

    const tapNpc = (clientX: number, clientY: number) => {
        const hit = tappedNpc(clientX, clientY)
        const talk = talkRef.current
        if (talk) {
            const spoken = spokenRef.current.has(talk.i)
            const last = talk.line + 1 >= talkLines(npcs[talk.i], spoken, questOpen).length // talkLines: **(npc, spoken)** -> **+ questOpen**, mechanism: picks the same Dialog entry NPCRenderer shows
            if (last && pickDialog(npcs[talk.i], spoken, questOpen).choices?.length) { // step: **none** -> **choices on the last line**, reason: はい opens the quest, いいえ ends the talk, mechanism: only a choice button answers; a tap on the NPC does nothing so the player has to pick
                const choice = tappedChoice(clientX, clientY)
                if (choice !== null && talkReady()) {
                    endTalk(talk)
                    if (choice === 0) onQuest?.(talk.i) // onQuest: **()** -> **(npc index)**, mechanism: the caller opens the quest of the NPC that asked
                    onChoice?.(talk.i, choice) // choice: **only 0 -> onQuest** -> **+ every choice to onChoice**, reason: the Quest Island routes はい / いいえ per NPC, mechanism: called after endTalk, so a handler can open the next talk (talkRequest) without this one overwriting it
                }
            }
            else if (hit === talk.i && talkReady()) {
                if (!last) talkRef.current = { ...talk, line: talk.line + 1 }
                else endTalk(talk) // end: **inline zoom/talk/spoken reset** -> **endTalk(talk)**, mechanism: same three steps, shared with the choices
            }
            return true
        }
        if (hit === null) return false
        startTalk(hit) // start: **inline talkRef + release** -> **startTalk(hit)**, mechanism: same two steps, shared with pressSpace and talkRequest
        return true
    }
    // true = the tap belonged to the talk and must not start the stick.
    // Not talking: a tap on a nearby NPC starts a talk and saves the zoom
    // target to return to. Talking: a tap on that NPC's bubble/body shows
    // the next line, and after the last one restores the saved zoom (the
    // camera goes back to following the player on its own). Taps anywhere
    // else, or before the zoom-in settles, do nothing -- movement is frozen

    const handleDown = (e: PointerEvent<HTMLDivElement>) => {
        if (activeIdRef.current !== null && e.pointerId !== activeIdRef.current && onShootRef.current?.()) { e.stopPropagation(); return } // second finger: **ignored, then starts a pinch** -> **shoots when onShoot fires**, mechanism: stopPropagation keeps it out of handlePinchDown on the scene div, so no pinch starts and the stick stays held
        if (activeIdRef.current !== null || pinchRef.current) return
        if (tapNpc(e.clientX, e.clientY)) return // down: **always starts the stick** -> **NPC tap first**, reason: NPCs are tapped through the stick overlay, mechanism: tapNpc handles talk taps and a consumed tap returns before the pointer is captured, so no stick appears
        activeIdRef.current = e.pointerId
        tapRef.current = { t: performance.now(), x: e.clientX, y: e.clientY } // down: **no record** -> **time + spot**, mechanism: handleUp compares against it to spot a quick tap
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

    const handleUp = (e: PointerEvent<HTMLDivElement>) => {
        if (e.pointerId !== activeIdRef.current) return
        const tap = tapRef.current
        tapRef.current = null
        if (e.type === 'pointerup' && tap && performance.now() - tap.t < TAP_MS && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < TAP_PX) onShootRef.current?.()
        release()
    }
    // up / cancel / lost capture: **release() for any pointer** -> **only the stick's own pointer**, mechanism: a shooting second finger lifting no longer lets go of the stick. A plain pointerup under TAP_MS that moved under TAP_PX counts as a tap and shoots (no-op without onShoot); cancel / lost capture only release

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
                    backgroundColor: bg.color,
                    ...(bg.border && { border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, boxSizing: 'border-box' }) // border: **none** -> **bubble edge when bg.border**, mechanism: border-box keeps the div bg.w x bg.h, so world px and the clamp are unchanged
                }}
            >
                {bg.sections?.map(sec => (
                    <div
                        key={sec.id}
                        style={{
                            position: 'absolute',
                            left: sec.x,
                            top: sec.y + (sec.wave ? waveRef.current : 0), // top: **sec.y** -> **sec.y + the wave offset**, mechanism: a wave section is drawn at where the tick put the wave this frame (the tick re-renders every frame)
                            width: sec.w,
                            height: sec.h - (sec.wave ? waveRef.current : 0), // height: **sec.h** -> **sec.h - the wave offset**, mechanism: the offset is 0 or negative, so the div grows by as much as it moved up and its bottom stays on the world's edge
                            zIndex: 0,
                            pointerEvents: 'none',
                            backgroundColor: sec.color,
                            ...(sec.tile && {
                                backgroundImage: `url(${sec.tile})`,
                                backgroundRepeat: 'repeat',
                                backgroundSize: SECTION_TILE_PX,
                                imageRendering: 'pixelated' as const,
                            }),
                        }}
                    />
                ))}
                {bg.sections?.filter(sec => sec.merge).map((sec, i) => ( // filter: **sec.merge && sec.tile** -> **sec.merge**, mechanism: a plain-color section has no tile but still gets its merged border
                    <div
                        key={`${sec.id}-merge`}
                        style={{
                            position: 'absolute',
                            left: sec.x,
                            top: sec.y - MERGE_H + (sec.wave ? waveRef.current : 0), // top: **sec.y - MERGE_H** -> **+ the wave offset**, mechanism: the shore strip moves with its section
                            width: sec.w,
                            height: MERGE_H,
                            zIndex: 0,
                            pointerEvents: 'none',
                            backgroundColor: sec.color, // backgroundColor: **none** -> **sec.color**, mechanism: the mask cuts the plain color the same way it cuts a tile
                            backgroundImage: sec.tile ? `url(${sec.tile})` : undefined, // backgroundImage: **always url(tile)** -> **only when the section has a tile**, mechanism: no request for url(undefined)
                            backgroundRepeat: 'repeat',
                            backgroundSize: SECTION_TILE_PX,
                            backgroundPosition: `0 ${MERGE_H % SECTION_TILE_PX}px`,
                            imageRendering: 'pixelated' as const,
                            maskImage: `url(${MERGE_MASK})`,
                            maskRepeat: 'repeat-x',
                            maskPosition: `${-i * MERGE_SHIFT}px 0`,
                            WebkitMaskImage: `url(${MERGE_MASK})`,
                            WebkitMaskRepeat: 'repeat-x',
                            WebkitMaskPosition: `${-i * MERGE_SHIFT}px 0`,
                        }}
                    />
                ))}
                {/* merge strips: for each section with merge, its own color
                    (and its tile, if it has one) is drawn again in the MERGE_H px above its top border and
                    cut by MERGE_MASK, so the lower soil reaches up into the
                    upper one with an uneven, dithered edge. The mask is used
                    at its own size (no scaling) and repeats left to right.
                    backgroundPosition starts a tile at the strip's bottom
                    edge, which is the section's top, so the pattern runs on
                    from the section with no step. They come after all the
                    section divs, so a strip draws over the section above it.
                    One mask serves every pair of soils */}
                {/* ground sections: one div per BgSection, first in the
                    world div and zIndex 0, so objects, entities and the
                    footprints (also zIndex 0, but later in the DOM) draw on
                    top. The tile repeats at SECTION_TILE_PX with pixelated
                    scaling; the color shows under it until the file loads */}
                {renderWorld?.()}
                {/* renderWorld: extra world-px children (training blocks), redrawn
                    every frame since the tick force()-renders */}
                {placed.map(({ obj, def }) => <ObjectRenderer key={obj.id} obj={obj} def={def} faded={!!pEnt && (pEnt.y ?? 0) + pEnt.h / 2 < obj.y + def.sprite.h && overlaps(pEnt.x ?? 0, pEnt.y ?? 0, pEnt.w, pEnt.h, { x: obj.x, y: obj.y, w: def.sprite.w, h: def.sprite.h })} />)}
                {/* faded = the player is behind this object: the player's
                    feet (center y + h/2) are above the sprite's bottom edge,
                    which is the same comparison the zIndexes use, so the
                    object draws in front, and the player's box overlaps the
                    sprite's box, so the object actually covers the player.
                    The scene re-renders every frame, so this follows the
                    player; ObjectRenderer eases the opacity */}
                {/* objects, each with a zIndex of its bottom edge */}
                <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 0 }}>
                <FootPrintRenderer velocity={velocityRef.current} maxSpeed={PLAYER_SPEED} x={pEnt?.x} y={pEnt?.y} h={pEnt?.h ?? ENT_H} />
                </div>
                {/* player footprints on the ground: a 0x0 wrapper at zIndex 0,
                    below every bottom-edge zIndex, so objects, NPCs and the
                    player all draw over them. Kept out of the player's wrapper,
                    whose zIndex follows the player, so prints left behind
                    don't draw over objects the player walked past */}
                {/* entities go here, sized/positioned in world px (no zoom) */}
                <div style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((pEnt?.y ?? 0) + (pEnt?.h ?? ENT_H) / 2) }}> {/* wrap: **none** -> **0x0 div with the player's bottom-edge zIndex**, mechanism: ent.y is the center, so + h/2 is the feet; compared with ObjectRenderer's y + sprite.h the lower one draws in front. The wrapper is its own stacking context, so the name tag's zIndex 1 still only orders it against the body */}
                <PlayerRenderer velocity={velocityRef.current} maxSpeed={PLAYER_SPEED} player={{ ...playerRef.current, name: playerLabel?.() ?? playerRef.current.name, talking: talkRef.current !== null }} /> {/* name: **player.name** -> **playerLabel?.() ?? player.name**, mechanism: PlayerRenderer puts player.name on the tag, so the label wins while it returns a string */} {/* player: **playerRef.current** -> **copy + talking**, mechanism: talkRef is non-null during a talk and the scene renders every frame, so PlayerRenderer sees talk start/end on the next frame; the copy is shallow, so ent is still the object the tick mutates */} {/* props: **velocity, player** -> **+ maxSpeed**, reason: lean scales with how hard the stick is pushed, mechanism: PLAYER_SPEED is full speed, so vel.x / PLAYER_SPEED is the stick's x (or ±1 / ±0.71 on keys); passed as a prop because the renderers importing it from here would be a circular import */}
                </div>
                {npcs.map((n, i) => {
                    const talk = talkRef.current
                    const near = nearNpc(n) // near: **inline overlaps** -> **nearNpc(n)**, mechanism: same TALK_RANGE check, moved into a helper so pressSpace picks the same NPCs
                    return (
                        <div key={`npc-${i}`} style={{ position: 'absolute', left: 0, top: 0, zIndex: Math.round((n.ent.y ?? 0) + n.ent.h / 2) }}>
                            <NPCRenderer npc={n} index={i} velocity={STILL} inRange={!talk && near} selected={talk?.i === i} spoken={spokenRef.current.has(i)} questOpen={questOpen} line={talk?.i === i && talkReady() ? talk.line : undefined} /> {/* render: **EntityRenderer, dialog only near the player** -> **NPCRenderer**, reason: NPCs are tapped to talk, mechanism: inRange is the same TALK_RANGE overlaps check (greeting bubble + tap target), off for everyone during a talk; the selected NPC gets its line once talkReady() */}
                        </div>
                    )
                })}
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
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                onLostPointerCapture={handleUp}
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
            <MuteButton />
            {/* sound on/off in the top-right corner, above the stick overlay.
                It is a sibling of the overlay, so a press never starts the
                stick, and it stops its own pointer events before they reach
                the pinch handlers on this div */}
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
