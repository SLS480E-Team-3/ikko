'use client'

import { createElement, Fragment, useCallback, useRef, useState } from "react"
import CharBlock, { CHAR_BLOCK_SIZE, TargetBubble } from "@/components/Game/Entity/charBlock" // import: **+ TargetBubble**, mechanism: drawn over Ryuuko while a level runs
import { dialogUrl, playLine } from "@/components/Game/Entity/voice"
import { BUBBLE_BOARDER, BUBBLE_BORDER_W } from "@/components/Game/Entity/dialogBubble"
import { ENT_H } from "@/components/Game/Entity/entityRenderer"
import { overlaps, type PlayerBox } from "./gameScene"
import { KANA_ROMAJI, rowOf } from "../kana"

export type TrainingPhase = 'intro' | 'play1' | 'levelUp' | 'break' | 'play2' | 'success' | 'fail' | 'again' // phases: **no break** -> **+ 'break'**, reason: いいえ to Ryuuko's level-up offer did nothing, mechanism: a phase of its own so questIslandNpcs can bring Elena out
// the Quest Island training's steps: Ryuuko's intro talk, level 1, her
// level-up talk, level 2, then success (Elena) or fail (Elena + Ryuuko)
// 'again': after success the player said いいえ to Elena, Ryuuko offers a replay
// 'break': after level 1 the player said いいえ to Ryuuko, Elena asks whether to go back

export const RYUUKO = 0
export const ELENA = 1
// NPC indices in questIslandNpcs(w, h, phase): Ryuuko is always index 0 and
// Elena index 1 (only in 'success' / 'fail'), so talkRequest and onChoice's
// npc argument can be compared against these

export const throwSpot = (w: number, h: number) => ({ x: w / 2, y: h / 4 }) // spot: **(w / 2, 160)** -> **(w / 2, h / 4)**, reason: Ryuuko stands further down, mechanism: a quarter of the island (half a screen) from the top, so her talk bubble has room and the player's walk up is shorter; npcs.ts places her here too
// where Ryuuko stands and every block is thrown from (world px, center)

const PLAY_DROP = 40
export const playSpot = (w: number, h: number) => ({ x: throwSpot(w, h).x, y: throwSpot(w, h).y + PLAY_DROP })
// where Ryuuko stands and throws from while a level is played: 40px below
// throwSpot. The player's start (PLAYER_GAP) and the wall (WALL_GAP) stay
// measured from throwSpot, so on screen (the camera follows the player)
// Ryuuko and her target bubble sit 40px lower, clear of the timer bar

const PLAYER_GAP = 350
// px in y from Ryuuko to the player when a level starts (はい to Ryuuko)

const WALL_GAP = 300
// px in y from Ryuuko to the line the player can't cross while a level runs:
// between her and the player's start (PLAYER_GAP), so blocks have room to
// spread out before they can be caught

const time = 60_000 //60s
const quota = 10
const maxHP = 10
// hp a level starts with; the HUD's hp bar is maxHP hits long

export type QuestsLevel = { target: string, pool: string[], speed: number, every: number }
// one training level: the kana to catch, what can be thrown, and how fast

export function levelsFor(target: string): QuestsLevel[] {
    return [
        { target, pool: [target], speed: 70, every: 1.2 },
        { target, pool: rowOf(target), speed: 110, every: 0.8 }, // pool: **fixed あいうえお** -> **rowOf(target)**, mechanism: dummies are the other kana of the target's own row (か → かきくけこ, す → さしすせそ)
    ]
}
// the two levels for one quest's kana. speed = px/s a block flies at, every =
// seconds between throws. Level 1 only throws the target; level 2 mixes in
// all five vowels

export const LEVELS: QuestsLevel[] = levelsFor('あ') // LEVELS: **hard-coded あ levels** -> **levelsFor('あ')**, mechanism: same two levels built by levelsFor; npcs.ts LEVEL(LEVELS) only reads its length, which is the same for every kana

const SPREAD = Math.PI / 4
// max angle (45°) a throw leans left or right of straight down

const TARGET_CHANCE = 0.4
// level 2: share of throws that are the target, the rest are a random other kana

export const ROMAJI: Record<string, string> = KANA_ROMAJI // ROMAJI: **あ–お only** -> **KANA_ROMAJI**, mechanism: kana.ts maps all 20 kana (shi / chi / tsu included)

type Block = { id: number, kana: string, x: number, y: number, vx: number, vy: number }

export type TrainingHud = { target: string, romaji: string, current: number, quota: number, hp: number, maxHP: number, secondsLeft: number, timeFrac: number, playing: boolean } // hud: **no maxHP / timeFrac** -> **+ maxHP, timeFrac**, mechanism: questIsland's bars size their fills as hp / maxHP and timeLeft / time

export function useTraining({ w, h, onLeave, kana = 'あ' }: { w: number, h: number, onLeave?: () => void, kana?: string }) { // args: **no kana (always あ)** -> **kana = 'あ'**, mechanism: the quest's kana picks the levels below
    const [phase, setPhaseState] = useState<TrainingPhase>('intro')
    const phaseRef = useRef<TrainingPhase>('intro')
    const [failedLevel, setFailedLevel] = useState<0 | 1>(0)
    const [talkRequest, setTalkRequest] = useState<{ npc: number, key: number } | undefined>(undefined)
    // phase is state so the parent re-renders (its NPC list depends on it);
    // phaseRef mirrors it synchronously so the stable onTick / onChoice read
    // the latest phase and a second tick in the same frame can't re-trigger

    const current = useRef(0)
    const hp = useRef(maxHP) // hp: **10** -> **maxHP**, mechanism: one constant the HUD bar also divides by
    const timeLeft = useRef(time)
    const spawnIn = useRef(0)
    const blocks = useRef<Block[]>([])
    const nextId = useRef(0)
    const sizeRef = useRef({ w, h })
    sizeRef.current = { w, h }
    const onLeaveRef = useRef(onLeave)
    onLeaveRef.current = onLeave
    const levelsRef = useRef(levelsFor(kana))
    if (levelsRef.current[0].target !== kana) levelsRef.current = levelsFor(kana)
    // this quest's levels, in a ref like w/h so the stable callbacks read them;
    // rebuilt only when the kana changes
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
        hp.current = maxHP // reset: **10** -> **maxHP**, mechanism: same constant as the HUD bar's length
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
        const lv = levelsRef.current[level] // levels: **LEVELS** -> **levelsRef.current**, mechanism: the quest's kana levels
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
            const from = playSpot(w, h) // from: **throwSpot** -> **playSpot**, mechanism: blocks leave Ryuuko's hands at her lowered play spot
            const angle = (Math.random() * 2 - 1) * SPREAD
            blocks.current.push({ id: nextId.current++, kana, x: from.x, y: from.y, vx: Math.sin(angle) * lv.speed, vy: Math.cos(angle) * lv.speed }) // direction: **toward a random point on the island** -> **straight down +- SPREAD**, reason: Ryuuko throws downward from the top, mechanism: angle 0 = down (vx 0, vy +speed), sin/cos keep the speed the same at any angle
        } // voice: **playLine(kana) on throw** -> **removed here**, mechanism: the kana is now said when the block is caught (below)
        // a throw every lv.every seconds (+= keeps the rhythm even if a frame
        // runs long). The direction is a random angle within SPREAD of straight
        // down at lv.speed px/s

        const s = CHAR_BLOCK_SIZE
        blocks.current = blocks.current.filter(b => {
            b.x += b.vx * dt
            b.y += b.vy * dt
            if (b.x < 0 || b.x > w || b.y < 0 || b.y > h) return false
            if (overlaps(player.x, player.y, player.w, player.h, { x: b.x - s / 2, y: b.y - s / 2, w: s, h: s })) {
                if (b.kana === lv.target) current.current++
                else hp.current--
                playLine(dialogUrl('ryuuko', b.kana)) // voice: **on throw** -> **on catch**, mechanism: Ryuuko says the caught block's kana (right or wrong), so the player hears what they grabbed; the shared <audio> cuts off the previous kana
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
            else { setPhase('success'); talkTo(RYUUKO) } // success: **talkTo(ELENA)** -> **talkTo(RYUUKO)**, mechanism: the talk zooms in on Ryuuko for her おつかれさま！, and onTalkEnd switches to 'again' after it
        }
        else if (hp.current <= 0 || timeLeft.current <= 0) {
            setFailedLevel(level)
            setPhase('fail')
            talkTo(ELENA)
        }
        // quota met: level 1 -> Ryuuko's level-up talk, level 2 -> Ryuuko's
        // おつかれさま！ (then 'again'). Out of hp or time: 'fail', Elena asks 諦めますか？ first;
        // Ryuuko's retry offer is reached by walking over to her
    }, [setPhase, talkTo])

    const failedRef = useRef(failedLevel)
    failedRef.current = failedLevel

    const onChoice = useCallback((npc: number, choice: number) => {
        const p = phaseRef.current
        if (npc === RYUUKO && p === 'again') {
            if (choice < levelsRef.current.length) startLevel(choice as 0 | 1)
            return
        }
        // 'again': Ryuuko's choices are the levels (npcs.ts LEVEL(LEVELS)), so
        // the choice index is the level to start from, not はい / いいえ
        if (choice !== 0) {
            if (npc === ELENA && p === 'success') setPhase('again')
            else if (npc === RYUUKO && p === 'levelUp') { setPhase('break'); talkTo(ELENA) }
            return
        } // いいえ: **Ryuuko's on levelUp ignored** -> **'break' + talk to Elena**, mechanism: the new phase adds Elena to questIslandNpcs and talkTo opens her しまにもどる？ right away (onChoice runs after endTalk, so the new talk isn't overwritten) // いいえ: **always ignored** -> **Elena's いいえ on success -> 'again'**, mechanism: staying on the island switches Ryuuko to her まだまだいけるでしょ？ offer
        if (npc === RYUUKO) {
            if (p === 'intro') startLevel(0) // again: **no phase** -> **replay from level 1**, mechanism: same startLevel as intro, so counters reset and the player is placed below Ryuuko // again: **はい -> level 1** -> **handled above by choice index**, mechanism: Ryuuko's 'again' offer lists the levels instead of はい / いいえ
            else if (p === 'levelUp' || p === 'break') startLevel(1) // levelUp: **only levelUp** -> **+ break**, mechanism: Ryuuko keeps her level-up offer while Elena is out, so はい still starts level 2
            else if (p === 'fail') startLevel(failedRef.current)
        }
        else if (npc === ELENA && (p === 'fail' || p === 'success' || p === 'again' || p === 'break')) onLeaveRef.current?.() // leave: **fail / success / again** -> **+ break**, mechanism: Elena's はい in 'break' goes back to the island too // leave: **fail / success** -> **+ again**, mechanism: Elena stays in 'again' with her go-back offer
    }, [startLevel, setPhase, talkTo])
    // はい (choice 0) does most of the work; いいえ just ends the talk and the
    // player can talk again, except Elena's いいえ after success, which moves
    // to 'again' so Ryuuko offers a replay. Ryuuko's はい starts / continues / retries a
    // level depending on the phase, Elena's はい leaves the island

    const onTalkEnd = useCallback((npc: number) => {
        if (npc === RYUUKO && phaseRef.current === 'success') setPhase('again')
    }, [setPhase])
    // Ryuuko's success talk (おつかれさま！, no choices) ending moves straight to
    // 'again', where talking to her again offers the level select. GameScene
    // calls this from endTalk, so it fires once whether Space or a tap ended it

    const renderWorld = useCallback(() => createElement(Fragment, null,
        (phaseRef.current === 'play1' || phaseRef.current === 'play2') && createElement('div', { key: 'wall', style: { position: 'absolute', left: 0, top: throwSpot(sizeRef.current.w, sizeRef.current.h).y + WALL_GAP - BUBBLE_BORDER_W / 2, width: sizeRef.current.w, height: BUBBLE_BORDER_W, background: BUBBLE_BOARDER, pointerEvents: 'none' } }), // wall: **none** -> **black line while playing**, mechanism: drawn at wallY in the bubble border's color / width; setPhase leaving play stops drawing it
        (phaseRef.current === 'play1' || phaseRef.current === 'play2') && createElement(TargetBubble, { key: 'target', kana: levelsRef.current[phaseRef.current === 'play1' ? 0 : 1].target, x: playSpot(sizeRef.current.w, sizeRef.current.h).x, y: playSpot(sizeRef.current.w, sizeRef.current.h).y, h: ENT_H }), // spot: **throwSpot** -> **playSpot**, mechanism: the bubble follows Ryuuko 40px down so the timer bar no longer covers the kana // target: **HUD only** -> **+ bubble over Ryuuko**, mechanism: the level's target kana in a CharBlock-sized DialogBubble at her spot (throwSpot, ENT_H tall like every npc()), only while playing
        ...blocks.current.map(b => createElement(CharBlock, { key: b.id, kana: b.kana, x: b.x, y: b.y })) // props: **kana + romaji** -> **kana only**, mechanism: no romaji passed, so CharBlock skips its English line; the HUD still shows the target's romaji
    ), [])
    // the flying blocks in world px; GameScene calls this every frame, so it
    // just reads the ref. createElement instead of JSX keeps this file .ts

    const getHud = useCallback((): TrainingHud => {
        const p = phaseRef.current
        const playing = p === 'play1' || p === 'play2'
        const lv = levelsRef.current[p === 'play2' || (p === 'fail' && failedRef.current === 1) ? 1 : 0]
        return {
            target: lv.target,
            romaji: ROMAJI[lv.target] ?? '',
            current: current.current,
            quota,
            hp: hp.current,
            maxHP,
            secondsLeft: Math.max(0, Math.ceil(timeLeft.current / 1000)),
            timeFrac: Math.min(1, Math.max(0, timeLeft.current / time)),
            playing,
        }
    }, [])
    // a snapshot read from the refs at call time, so call it from something
    // that re-renders each frame (e.g. inside renderWorld's output or a
    // component re-rendered by GameScene); the parent itself doesn't

    const playerLabel = useCallback((): string | undefined => {
        const p = phaseRef.current
        return p === 'play1' || p === 'play2' ? `${current.current}/${quota}` : undefined
    }, [])
    // the player's name tag text while a level runs; undefined otherwise, so
    // GameScene falls back to the player's real name. Read from the refs, and
    // GameScene calls it in its per-frame render, so the count stays live

    const wallY = phase === 'play1' || phase === 'play2' ? throwSpot(w, h).y + WALL_GAP : undefined
    // the line GameScene keeps the player below; only while a level runs, so
    // it goes away on levelUp / success / fail and Ryuuko can be reached again

    return { phase, wallY, onTick, onChoice, onTalkEnd, renderWorld, getHud, playerLabel, talkRequest, moveRequest } // return: **no playerLabel** -> **+ playerLabel**, mechanism: questIsland.tsx passes it to GameScene for the current/quota tag // return: **no onTalkEnd** -> **+ onTalkEnd**, mechanism: passed to GameScene by questIsland.tsx
}
// usage: pass onTick / onChoice / renderWorld / talkRequest straight to
// GameScene and build the NPC list with questIslandNpcs(w, h, phase)
