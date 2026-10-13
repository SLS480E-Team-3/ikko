'use client'

import { createElement, Fragment, useCallback, useEffect, useRef, useState } from "react"
import { lineUrl, playLine, playSfx, preloadClips } from "@/components/Game/Entity/voice"
import { BUBBLE_BORDER_W } from "@/components/Game/Entity/dialogBubble"
import { toDialogs } from "../npcs/toNPCProps"
import ryuuko from "../npcs/dialogs/ryuuko.json"
import { buildRun, LR_QUESTIONS, VERBS, type Question, type Side } from "../verbs"
import { DOJO_BOTTOM, DOJO_SIDE, DOJO_TOP, overlaps, type PlayerBox } from "./gameScene"
import { ELENA, RYUUKO, type TrainingHud } from "./training"
// the Left or Right quest (docs/left-or-right.spec.json), built like
// dodgeTraining.ts's useDodgeTraining, in a long hallway (hallSections): a
// sign over the door row shows a verb, the player walks into the red (left) or blue (right) door
// whose English meaning matches it. 10 correct = clear, 3 wrong = fail, no
// timer. Ryuuko is off screen during the run (npcs.ts leftRightNpcs returns
// no one in 'play'); this file must not import npcs.ts (it imports us)

export type LrPhase = 'intro' | 'play' | 'success' | 'fail' | 'again'
// Ryuuko's rules talk, the run, then success (Ryuuko, then Elena) or fail
// (Elena + Ryuuko); 'again': いいえ to Elena after success, Ryuuko offers a replay

const WALL_TOP = DOJO_TOP
const WALL_SIDE = DOJO_SIDE
const WALL_BOTTOM = DOJO_BOTTOM // walls: **copied numbers (104 / 48 / 88)** -> **gameScene's DOJO_TOP / DOJO_SIDE / DOJO_BOTTOM**, mechanism: exported there now, so a wall resize moves the sign, doors and spawn with it
// the far, side and near walls are solid, so everything the player has to
// reach sits inside them

const FLOOR_TOP = WALL_TOP // y: **BUBBLE_BORDER_W + WALL_TOP** -> **WALL_TOP**, reason: the doors sat 2 px off and a sliver of plaster showed at the red door's edge, mechanism: sections, renderWorld and the player are all placed inside the world's border box, so no border offset is added
// world y of the floor's top edge

export const DOOR_W = 92 // width: **88** -> **92**, reason: the post between the doors is gone, mechanism: the two doors alone fill the same 184 px inner width
export const DOOR_H = 96
const DOOR_FRAME = 4
// door size and the darker frame width // DOOR_GAP: **8 (a solid post between the doors)** -> **removed**, reason: no splitter, mechanism: the doors touch; onTick picks the side by the player's x

const HALL_INNER = DOOR_W * 2
export const HALL_W = HALL_INNER + WALL_SIDE * 2 + BUBBLE_BORDER_W * 2
const CORRIDOR = 200 // corridor: **240** -> **200**, reason: the hall is one room now, mechanism: the whole island (552 px) is about one phone screen at zoom 1.5
export const hallH = () => doorBottom(0) + CORRIDOR + SPAWN_LIFT + WALL_BOTTOM + BUBBLE_BORDER_W // hallH: **3 x the screen height** -> **fixed, CORRIDOR px from the doors to the spawn**, reason: the corridor was too long (~2000 px walk per question), mechanism: the island ends just below the spawn, so the player starts CORRIDOR px under the doors (about a 2 s walk)
// the island: one room, exactly as wide as the door row plus the side walls
// and the border (284 px); hallH stacks the back wall, the doors at its
// foot, CORRIDOR, the spawn's lift and the near wall (552 px).
// The camera centers a world narrower than the screen (GameScene)

// SIGN_W / SIGN_H / SIGN_GAP: **world-px sign on the back wall** -> **moved to the shell's HUD**, reason: the doors fill the back wall now, so there is no room above them, mechanism: getSign() hands the text to leftRightQuestIsland.tsx, which draws it at the top of the screen
// END_ROOM / PARTITION: **room past the doors + a wall behind them** -> **removed**, reason: the hall is one room with the doors in its back wall, mechanism: the back (far) wall is the partition now, and there is no end room

export const doorTop = (h: number) => FLOOR_TOP - DOOR_H // top: **FLOOR_TOP - DOJO_PANEL** -> **FLOOR_TOP - DOOR_H**, reason: doors further up, mechanism: they stand fully in the back wall's face, their bottom edge on the floor line, like doors seen from the front
export const doorBottom = (h: number) => doorTop(h) + DOOR_H
// the door row's top and bottom y: in the back wall, the bottom on the floor line. h is
// unused but kept so every spot function takes the island size the same way

export const doorBoxes = (w: number, h: number): Record<Side, { x: number, y: number, w: number, h: number }> => {
    const x = WALL_SIDE // x: **BUBBLE_BORDER_W + WALL_SIDE** -> **WALL_SIDE**, mechanism: same as FLOOR_TOP
    const y = doorTop(h)
    return {
        left: { x, y, w: DOOR_W, h: DOOR_H },
        right: { x: x + DOOR_W, y, w: DOOR_W, h: DOOR_H },
    }
}
// doorBoxes: **two boxes DOOR_GAP apart around the center, below the sign** -> **the whole hall width, left wall to right wall**, mechanism: the left door starts at the left wall, the right one ends at the right wall, touching in the middle. They're inside the solid back wall, so the player stops at their bottom edge; onTick picks one on that touch

// hallDoors / signSpot: **door post for hallSections, sign spot** -> **removed**, mechanism: no post, and the sign is a HUD now

const SPAWN_LIFT = 60
const RYUUKO_AHEAD = 80
export const spawnSpot = (w: number, h: number) => ({ x: w / 2, y: h - BUBBLE_BORDER_W - WALL_BOTTOM - SPAWN_LIFT })
export const startSpot = (w: number, h: number) => ({ x: w / 2, y: spawnSpot(w, h).y - RYUUKO_AHEAD })
// the player (re)starts at the bottom of the hall, SPAWN_LIFT above the near
// wall; at the start Ryuuko stands RYUUKO_AHEAD in front of them (above).
// After a clear the player comes out of the doors into the "next room" (the
// same room, reached through the black screen): at the spawn again, with
// Ryuuko and Elena at startSpot // endSpot / endPlayerSpot: **the room past the doors** -> **removed (startSpot / spawnSpot)**, mechanism: no end room

const BOUNCE = 48
const DOOR_REACH = 6
export const FEET_H = 8
// FEET_H: the player's hit box is only the bottom FEET_H px of the body (GameScene feetH), so the body walks up over the doors and the feet touch them
// a wrong door pushes the player BOUNCE px back below the door row. The
// solid back wall stops the player at the doors' bottom edge, so a door's
// hit box reaches DOOR_REACH px below it to catch that touch // WALL_TOUCH + wallY: **the player reaches 4 px into the doors** -> **DOOR_REACH below them**, mechanism: the doors are in the wall now, which already blocks

const FADE_IN = 250
const FADE_HOLD = 150
const FADE_OUT = 300
// the black screen when the player goes through a door: ms to black, ms
// held black (the move happens at its start), ms back

const quota = LR_QUESTIONS
const maxHP = 3
const DAMAGE_SFX = '/_SFX/tookDamage.mp3'
const SUB_MS = 1500
const NEXT_MS = 800
// 10 correct to clear, 3 hp, the damage sound (same file as the other
// trainings), how long a line's text stays on the sign, and the wait between
// Ryuuko's correct / wrong line and the next word's question

const DOOR_COLOR: Record<Side, { fill: string, frame: string }> = {
    left: { fill: '#c8302a', frame: '#7e1d19' },
    right: { fill: '#2f5bb7', frame: '#1d3a75' },
}
// red door on the left, blue on the right (spec D-1), each with a darker frame

type RunLine = 'lr-word' | 'lr-correct' | 'lr-wrong'
const lineOf = (verb: string, cond: RunLine) => toDialogs(ryuuko, verb).find(d => d.condition === cond)
// Ryuuko's in-run line for one verb: jp[0] is the kana shown on the sign,
// audio[0] the clip name(s) (lr-word is '<verb>|はどういう意味？', two clips)

export function useLeftRightTraining({ w, h, onLeave }: { w: number, h: number, onLeave?: () => void }) {
    const [phase, setPhaseState] = useState<LrPhase>('intro')
    const phaseRef = useRef<LrPhase>('intro')
    const [talkRequest, setTalkRequest] = useState<{ npc: number, key: number } | undefined>(undefined)
    const [moveRequest, setMoveRequest] = useState<{ x: number, y: number, key: number } | undefined>(undefined)
    const [failAt, setFailAt] = useState<{ x: number, y: number } | undefined>(undefined)
    // failAt: where the player stood when hp ran out, so leftRightNpcs can
    // bring Ryuuko and Elena to them (state, since the NPC list depends on it)

    const questions = useRef<Question[]>([])
    const current = useRef(0)
    const hp = useRef(maxHP)
    const hurtAt = useRef(-Infinity)
    const subText = useRef('')
    const subAt = useRef(-Infinity)
    const waitClear = useRef(false)
    const nextTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const fadeAt = useRef(-Infinity)
    const fadeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    // fadeAt: when the last black-screen transition started; fadeTimer runs its
    // action once the screen is black
    const sizeRef = useRef({ w, h })
    sizeRef.current = { w, h }
    const onLeaveRef = useRef(onLeave)
    onLeaveRef.current = onLeave
    // same layout as useDodgeTraining: phase is state (the NPC list depends on
    // it) mirrored in phaseRef, the per-frame state lives in refs so the
    // callbacks stay stable. questions starts empty (buildRun is random, so it
    // runs on はい, not during render, and server / client markup agree).
    // subText / subAt: the sign's sub-line and when it was set. waitClear
    // ignores the doors after a pick until the player is off both of them

    const clearNext = () => {
        if (nextTimer.current !== undefined) clearTimeout(nextTimer.current)
        nextTimer.current = undefined
    }
    useEffect(() => () => { clearNext(); if (fadeTimer.current !== undefined) clearTimeout(fadeTimer.current) }, [])
    // the pending next-word question is dropped on unmount (and on any phase
    // change, in setPhase), so it never speaks over a talk or another scene

    const setPhase = useCallback((p: LrPhase) => {
        phaseRef.current = p
        setPhaseState(p)
        clearNext()
    }, [])

    const talkTo = useCallback((npc: number) => setTalkRequest(r => ({ npc, key: (r?.key ?? 0) + 1 })), [])
    const toSpawn = useCallback(() => {
        const s = spawnSpot(sizeRef.current.w, sizeRef.current.h)
        setMoveRequest(r => ({ x: s.x, y: s.y, key: (r?.key ?? 0) + 1 }))
    }, [])
    const bounce = useCallback((x: number) => {
        setMoveRequest(r => ({ x, y: doorBottom(sizeRef.current.h) + BOUNCE, key: (r?.key ?? 0) + 1 }))
    }, [])
    const fadeTo = useCallback((action: () => void) => {
        if (fadeTimer.current !== undefined) clearTimeout(fadeTimer.current)
        fadeAt.current = performance.now()
        fadeTimer.current = setTimeout(() => { fadeTimer.current = undefined; action() }, FADE_IN)
    }, [])
    // a black-screen transition: the screen goes black over FADE_IN, then
    // action runs (moving the player while nothing can be seen), holds
    // FADE_HOLD and fades back over FADE_OUT. getFade() gives the shell the
    // opacity each frame
    const moveTo = useCallback((x: number, y: number) => setMoveRequest(r => ({ x, y, key: (r?.key ?? 0) + 1 })), [])
    // bounce: a wrong door pushes the player BOUNCE px below the door row,
    // keeping their x, so they stay in front of the same doors
    // key bumps so GameScene re-opens a talk / re-places the player each time

    const say = (verb: string, cond: RunLine) => {
        const d = lineOf(verb, cond)
        if (!d) return
        playLine(lineUrl('ryuuko', d.audio[0]))
        subText.current = d.jp[0]
        subAt.current = performance.now()
    }
    // plays one of Ryuuko's in-run lines and puts its kana on the sign for
    // SUB_MS; playLine cuts off whatever she was saying

    const ask = () => {
        const q = questions.current[current.current]
        if (q) say(q.verb, 'lr-word')
    }
    // reads the current question's verb, then はどういう意味？

    const startRun = useCallback(() => {
        questions.current = buildRun()
        current.current = 0
        hp.current = maxHP
        waitClear.current = false
        preloadClips([
            ...VERBS.flatMap(v => (['lr-word', 'lr-correct', 'lr-wrong'] as RunLine[])
                .flatMap(c => { const d = lineOf(v.verb, c); return d?.audio[0] ? lineUrl('ryuuko', d.audio[0]).split('\n') : [] })),
            DAMAGE_SFX,
        ])
        // decodes every in-run clip up front (each verb's word line is two
        // clips; correct / wrong repeat across verbs, and load() fetches a url
        // only once) plus the damage sound
        const go = () => { toSpawn(); setPhase('play'); ask() }
        if (phaseRef.current === 'success' || phaseRef.current === 'again') fadeTo(go)
        else go()
    }, [setPhase, toSpawn, fadeTo])
    // a fresh run of 10 questions: counters reset, player back at the spawn,
    // and the first word is asked right away. From the end room (a replay
    // after a clear) the move goes through the black screen, since the
    // player crosses the partition

    const onTick = useCallback((_dt: number, player: PlayerBox) => {
        if (phaseRef.current !== 'play') return
        const q = questions.current[current.current]
        if (!q) return
        const doors = doorBoxes(sizeRef.current.w, sizeRef.current.h)
        const row = { x: doors.left.x, y: doors.left.y, w: DOOR_W * 2, h: DOOR_H + DOOR_REACH }
        const hit: Side | undefined = overlaps(player.x, player.y + (player.h - FEET_H) / 2, player.w, FEET_H, row) ? (player.x < doors.right.x ? 'left' : 'right') : undefined // test: **the whole body** -> **the feet (bottom FEET_H px)**, reason: hit box only at the feet, mechanism: the same feet box GameScene blocks with; the back wall stops the feet at the doors' bottom edge, and DOOR_REACH catches that touch
        // hit: **the first door box the player overlaps** -> **the door row, then the side of the player's center**, reason: the doors touch now, so a player in the middle overlaps both, mechanism: one box for the whole row (reaching DOOR_REACH below), the door is the half the player's center x is in
        if (waitClear.current) {
            if (!hit) waitClear.current = false
            return
        }
        if (!hit) return
        waitClear.current = true
        // one pick per walk-in: until the moveRequest below lands (a render
        // later) the door they're still touching is ignored

        if (hit === q.correctSide) {
            current.current++
            say(q.verb, 'lr-correct')
            if (current.current >= quota) {
                const { w, h } = sizeRef.current
                const e = spawnSpot(w, h)
                fadeTo(() => { setPhase('success'); moveTo(e.x, e.y); talkTo(RYUUKO) }) // spot: **endPlayerSpot** -> **spawnSpot**, mechanism: the next room is the same room; Ryuuko and Elena now stand in front of the spawn
                return
            }
            fadeTo(toSpawn)
        }
        else {
            hp.current--
            hurtAt.current = performance.now()
            playSfx(DAMAGE_SFX)
            if (hp.current <= 0) { setFailAt({ x: player.x, y: player.y }); setPhase('fail'); talkTo(ELENA); return }
            bounce(player.x)
            say(q.verb, 'lr-wrong')
        }
        // correct: **toSpawn / 10th -> doors open, walk to Ryuuko** -> **through the black screen: toSpawn / 10th -> into the end room below Ryuuko + her talk**, reason: a wall behind the doors closes off the end room and going through a door fades to black, mechanism: fadeTo runs the move once the screen is black; いいね！ plays first in both cases
        // wrong: **back to spawn** -> **bounce(player.x)**, reason: the door stays shut and the player is pushed back in front of it, mechanism: moveRequest BOUNCE px below the row; at 0 hp failAt keeps the spot so Ryuuko and Elena come there
        clearNext()
        nextTimer.current = setTimeout(() => { nextTimer.current = undefined; if (phaseRef.current === 'play') ask() }, NEXT_MS)
        // correct: next question; wrong: -1 hp with the flash and damage
        // sound, same question again. Ryuuko's いいね！ / 違うわよ！ plays, and
        // NEXT_MS later the (next or same) word is asked. The 10th correct
        // opens the doors, 0 hp brings Elena's 諦めますか？
    }, [setPhase, talkTo, toSpawn, bounce, fadeTo, moveTo])

    const onChoice = useCallback((npc: number, choice: number) => {
        const p = phaseRef.current
        if (npc === RYUUKO) {
            if (choice === 0 && (p === 'intro' || p === 'fail' || p === 'again')) startRun()
            return
        }
        if (npc === ELENA) {
            if (choice === 0) onLeaveRef.current?.()
            else if (p === 'success') setPhase('again')
        }
    }, [startRun, setPhase])
    // はい to Ryuuko starts / retries a run, はい to Elena leaves the island;
    // いいえ to Elena after success moves to 'again' (Ryuuko's replay offer),
    // any other いいえ just ends the talk

    const onTalkEnd = useCallback((npc: number) => {
        if (npc === RYUUKO && phaseRef.current === 'success') setPhase('again')
    }, [setPhase])
    // Ryuuko's おつかれさま！ ending moves to her replay offer, like dodge

    const renderWorld = useCallback(() => {
        const { w, h } = sizeRef.current
        const playing = phaseRef.current === 'play'
        const q = questions.current[current.current]
        const doors = doorBoxes(w, h)
        return createElement(Fragment, null,
            ...(['left', 'right'] as Side[]).map(side => createElement('div', {
                key: `door-${side}`,
                style: {
                    position: 'absolute', left: doors[side].x, top: doors[side].y, width: doors[side].w, height: doors[side].h, boxSizing: 'border-box',
                    background: DOOR_COLOR[side].fill, border: `${DOOR_FRAME}px solid ${DOOR_COLOR[side].frame}`, // background: **transparent after a clear** -> **always the door color**, mechanism: the player reaches the end room through the black screen now, so the doors never open
                    color: 'white', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 4, pointerEvents: 'none',
                },
            }, playing && q ? (side === q.correctSide ? q.answer : q.decoy) : null)),
        )
    }, [])
    // the doors, always drawn, labelled only while playing. In world px, read
    // from the refs each frame; createElement keeps this file .ts // sign: **drawn here** -> **getSign() for the shell's HUD**

    const getSign = useCallback(() => {
        const q = questions.current[current.current]
        if (phaseRef.current !== 'play' || !q) return undefined
        return { verb: q.verb, romaji: q.romaji, sub: performance.now() - subAt.current < SUB_MS ? subText.current : '' }
    }, [])
    // the sign's text while playing: the verb, its romaji, and the latest
    // in-run line's kana for SUB_MS. The shell draws it at the top of the
    // screen, read each frame by its own rAF

    const getHud = useCallback((): TrainingHud => {
        const q = questions.current[current.current] ?? questions.current[questions.current.length - 1]
        return {
            target: q?.verb ?? '',
            romaji: q?.romaji ?? '',
            current: current.current,
            quota,
            hp: hp.current,
            maxHP,
            secondsLeft: 0,
            timeFrac: 1,
            playing: phaseRef.current === 'play',
            hurtAt: hurtAt.current,
        }
    }, [])
    // the HUD snapshot; no timer, so secondsLeft 0 and a full timeFrac. After
    // the 10th correct current is past the end, so the last verb is shown

    const playerLabel = useCallback((): string | undefined =>
        phaseRef.current === 'play' ? `${current.current}/${quota}` : undefined, [])
    // current/10 on the player's name tag while a run is going

    const getFade = useCallback(() => {
        const t = performance.now() - fadeAt.current
        return t < FADE_IN ? t / FADE_IN : t < FADE_IN + FADE_HOLD ? 1 : Math.max(0, 1 - (t - FADE_IN - FADE_HOLD) / FADE_OUT)
    }, [])
    // the black screen's opacity now: up over FADE_IN, 1 for FADE_HOLD, down
    // over FADE_OUT, 0 otherwise (fadeAt starts at -Infinity)

    return { phase, onTick, onChoice, onTalkEnd, renderWorld, getHud, playerLabel, talkRequest, moveRequest, failAt, getFade, getSign } // return: **wallY** -> **getSign**, mechanism: the solid back wall stops the player at the doors, and the sign is drawn by the shell // return: **+ getFade**, mechanism: the shell draws the black screen from it // return: **+ wallY, failAt**, mechanism: the island shell passes wallY to GameScene and failAt to leftRightNpcs
}
// usage: like useDodgeTraining (no wallY, no failedLevel): pass the callbacks
// to GameScene and build the NPC list with leftRightNpcs(w, h, phase)
