'use client'

import { createElement, Fragment, useCallback, useRef, useState } from "react"
import CharBlock, { CHAR_BLOCK_SIZE } from "@/components/Game/Entity/charBlock"
import { dialogUrl, playLine } from "@/components/Game/Entity/voice"
import { overlaps, type PlayerBox } from "./gameScene"

export type TrainingPhase = 'intro' | 'play1' | 'levelUp' | 'play2' | 'success' | 'fail' | 'again'
// the Quest Island training's steps: Ryuuko's intro talk, level 1, her
// level-up talk, level 2, then success (Elena) or fail (Elena + Ryuuko)
// 'again': after success the player said いいえ to Elena, Ryuuko offers a replay

export const RYUUKO = 0
export const ELENA = 1
// NPC indices in questIslandNpcs(w, h, phase): Ryuuko is always index 0 and
// Elena index 1 (only in 'success' / 'fail'), so talkRequest and onChoice's
// npc argument can be compared against these

export const throwSpot = (w: number, h: number) => ({ x: w / 2, y: h / 4 }) // spot: **(w / 2, 160)** -> **(w / 2, h / 4)**, reason: Ryuuko stands further down, mechanism: a quarter of the island (half a screen) from the top, so her talk bubble has room and the player's walk up is shorter; npcs.ts places her here too
// where Ryuuko stands and every block is thrown from (world px, center)

const PLAYER_GAP = 350
// px in y from Ryuuko to the player when a level starts (はい to Ryuuko)

const time = 30_000 //30s
const quota = 10

export type QuestsLevel = { target: string, pool: string[], speed: number, every: number }
// one training level: the kana to catch, what can be thrown, and how fast

export const LEVELS: QuestsLevel[] = [ // LEVELS: **private, inferred type** -> **exported QuestsLevel[]**, mechanism: npcs.ts builds Ryuuko's level-select choices from it, one per entry
    { target: 'あ', pool: ['あ'], speed: 70, every: 1.2 },
    { target: 'あ', pool: ['あ', 'い', 'う', 'え', 'お'], speed: 110, every: 0.8 },
]
// speed = px/s a block flies at, every = seconds between throws. Level 1
// only throws the target; level 2 mixes in the other vowels

const SPREAD = Math.PI / 3
// max angle (60°) a throw leans left or right of straight down

const TARGET_CHANCE = 0.4
// level 2: share of throws that are the target, the rest are a random other kana

export const ROMAJI: Record<string, string> = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o' }

type Block = { id: number, kana: string, x: number, y: number, vx: number, vy: number }

export type TrainingHud = { target: string, romaji: string, current: number, quota: number, hp: number, secondsLeft: number, playing: boolean }

export function useTraining({ w, h, onLeave }: { w: number, h: number, onLeave?: () => void }) {
    const [phase, setPhaseState] = useState<TrainingPhase>('intro')
    const phaseRef = useRef<TrainingPhase>('intro')
    const [failedLevel, setFailedLevel] = useState<0 | 1>(0)
    const [talkRequest, setTalkRequest] = useState<{ npc: number, key: number } | undefined>(undefined)
    // phase is state so the parent re-renders (its NPC list depends on it);
    // phaseRef mirrors it synchronously so the stable onTick / onChoice read
    // the latest phase and a second tick in the same frame can't re-trigger

    const current = useRef(0)
    const hp = useRef(10)
    const timeLeft = useRef(time)
    const spawnIn = useRef(0)
    const blocks = useRef<Block[]>([])
    const nextId = useRef(0)
    const sizeRef = useRef({ w, h })
    sizeRef.current = { w, h }
    const onLeaveRef = useRef(onLeave)
    onLeaveRef.current = onLeave
    // the per-frame game state lives in refs: onTick mutates them 60 times a
    // second and GameScene's own force() render redraws renderWorld from
    // them, so no React state changes per frame. w/h and onLeave are kept in
    // refs so the callbacks below stay stable

    const setPhase = useCallback((p: TrainingPhase) => {
        phaseRef.current = p
        setPhaseState(p)
        if (p !== 'play1' && p !== 'play2') blocks.current = []
    }, [])
    // one place that changes the phase: updates the ref first (the tick reads
    // it right away) and clears any flying blocks when leaving play

    const [moveRequest, setMoveRequest] = useState<{ x: number, y: number, key: number } | undefined>(undefined)
    // where GameScene should place the player; key bumps like talkRequest

    const talkTo = useCallback((npc: number) => setTalkRequest(r => ({ npc, key: (r?.key ?? 0) + 1 })), [])
    // bumping key asks GameScene to open a talk even with the same NPC again.
    // Called together with setPhase, so React batches both into one render and
    // GameScene's talkRequest effect sees the new phase's NPC list

    const startLevel = useCallback((level: 0 | 1) => {
        current.current = 0
        hp.current = 10
        timeLeft.current = time
        spawnIn.current = 0
        blocks.current = []
        const from = throwSpot(sizeRef.current.w, sizeRef.current.h)
        setMoveRequest(r => ({ x: from.x, y: from.y + PLAYER_GAP, key: (r?.key ?? 0) + 1 })) // start: **player stays where they talked** -> **placed PLAYER_GAP below Ryuuko**, mechanism: bumps moveRequest, GameScene's effect sets the player's center to (Ryuuko x, Ryuuko y + 350) before the first throw
        setPhase(level === 0 ? 'play1' : 'play2')
    }, [setPhase])
    // resets the counters for a (re)start; spawnIn 0 throws the first block
    // on the next tick

    const onTick = useCallback((dt: number, player: PlayerBox) => {
        const p = phaseRef.current
        if (p !== 'play1' && p !== 'play2') return
        const level: 0 | 1 = p === 'play1' ? 0 : 1
        const lv = LEVELS[level]
        const { w, h } = sizeRef.current
        timeLeft.current -= dt * 1000
        // dt is seconds (GameScene's clamped rAF delta); time is in ms

        spawnIn.current -= dt
        if (spawnIn.current <= 0) {
            spawnIn.current += lv.every
            const others = lv.pool.filter(k => k !== lv.target)
            const kana = others.length === 0 || Math.random() < TARGET_CHANCE
                ? lv.target
                : others[Math.floor(Math.random() * others.length)]
            const from = throwSpot(w, h)
            const angle = (Math.random() * 2 - 1) * SPREAD
            blocks.current.push({ id: nextId.current++, kana, x: from.x, y: from.y, vx: Math.sin(angle) * lv.speed, vy: Math.cos(angle) * lv.speed }) // direction: **toward a random point on the island** -> **straight down +- SPREAD**, reason: Ryuuko throws downward from the top, mechanism: angle 0 = down (vx 0, vy +speed), sin/cos keep the speed the same at any angle
            playLine(dialogUrl('ryuuko', kana))
        }
        // a throw every lv.every seconds (+= keeps the rhythm even if a frame
        // runs long). The direction is a random angle within SPREAD of straight
        // down at lv.speed px/s. Ryuuko says each kana as she throws it

        const s = CHAR_BLOCK_SIZE
        blocks.current = blocks.current.filter(b => {
            b.x += b.vx * dt
            b.y += b.vy * dt
            if (b.x < 0 || b.x > w || b.y < 0 || b.y > h) return false
            if (overlaps(player.x, player.y, player.w, player.h, { x: b.x - s / 2, y: b.y - s / 2, w: s, h: s })) {
                if (b.kana === lv.target) current.current++
                else hp.current--
                return false
            }
            return true
        })
        // blocks and the player are both center-anchored; overlaps() takes the
        // player's center + size and a top-left box, so the block's center
        // minus half its size is that box. A caught block is removed: the
        // target scores, anything else costs 1 hp. Off-island blocks drop

        if (current.current >= quota) {
            if (level === 0) { setPhase('levelUp'); talkTo(RYUUKO) }
            else { setPhase('success'); talkTo(ELENA) }
        }
        else if (hp.current <= 0 || timeLeft.current <= 0) {
            setFailedLevel(level)
            setPhase('fail')
            talkTo(ELENA)
        }
        // quota met: level 1 -> Ryuuko's level-up talk, level 2 -> Elena's
        // success talk. Out of hp or time: 'fail', Elena asks 諦めますか？ first;
        // Ryuuko's retry offer is reached by walking over to her
    }, [setPhase, talkTo])

    const failedRef = useRef(failedLevel)
    failedRef.current = failedLevel

    const onChoice = useCallback((npc: number, choice: number) => {
        const p = phaseRef.current
        if (npc === RYUUKO && p === 'again') {
            if (choice < LEVELS.length) startLevel(choice as 0 | 1)
            return
        }
        // 'again': Ryuuko's choices are the levels (npcs.ts LEVEL(LEVELS)), so
        // the choice index is the level to start from, not はい / いいえ
        if (choice !== 0) {
            if (npc === ELENA && p === 'success') setPhase('again')
            return
        } // いいえ: **always ignored** -> **Elena's いいえ on success -> 'again'**, mechanism: staying on the island switches Ryuuko to her まだまだいけるでしょ？ offer
        if (npc === RYUUKO) {
            if (p === 'intro') startLevel(0) // again: **no phase** -> **replay from level 1**, mechanism: same startLevel as intro, so counters reset and the player is placed below Ryuuko // again: **はい -> level 1** -> **handled above by choice index**, mechanism: Ryuuko's 'again' offer lists the levels instead of はい / いいえ
            else if (p === 'levelUp') startLevel(1)
            else if (p === 'fail') startLevel(failedRef.current)
        }
        else if (npc === ELENA && (p === 'fail' || p === 'success' || p === 'again')) onLeaveRef.current?.() // leave: **fail / success** -> **+ again**, mechanism: Elena stays in 'again' with her go-back offer
    }, [startLevel, setPhase])
    // はい (choice 0) does most of the work; いいえ just ends the talk and the
    // player can talk again, except Elena's いいえ after success, which moves
    // to 'again' so Ryuuko offers a replay. Ryuuko's はい starts / continues / retries a
    // level depending on the phase, Elena's はい leaves the island

    const renderWorld = useCallback(() => createElement(Fragment, null,
        ...blocks.current.map(b => createElement(CharBlock, { key: b.id, kana: b.kana, x: b.x, y: b.y })) // props: **kana + romaji** -> **kana only**, mechanism: no romaji passed, so CharBlock skips its English line; the HUD still shows the target's romaji
    ), [])
    // the flying blocks in world px; GameScene calls this every frame, so it
    // just reads the ref. createElement instead of JSX keeps this file .ts

    const getHud = useCallback((): TrainingHud => {
        const p = phaseRef.current
        const playing = p === 'play1' || p === 'play2'
        const lv = LEVELS[p === 'play2' || (p === 'fail' && failedRef.current === 1) ? 1 : 0]
        return {
            target: lv.target,
            romaji: ROMAJI[lv.target] ?? '',
            current: current.current,
            quota,
            hp: hp.current,
            secondsLeft: Math.max(0, Math.ceil(timeLeft.current / 1000)),
            playing,
        }
    }, [])
    // a snapshot read from the refs at call time, so call it from something
    // that re-renders each frame (e.g. inside renderWorld's output or a
    // component re-rendered by GameScene); the parent itself doesn't

    return { phase, onTick, onChoice, renderWorld, getHud, talkRequest, moveRequest }
}
// usage: pass onTick / onChoice / renderWorld / talkRequest straight to
// GameScene and build the NPC list with questIslandNpcs(w, h, phase)
