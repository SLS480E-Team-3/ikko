'use client'

import { createElement, Fragment, useCallback, useRef, useState } from "react"
import CharBlock, { CHAR_BLOCK_SIZE, TargetBubble } from "@/components/Game/Entity/charBlock"
import { dialogUrl, playLine, playSfx, preloadClips } from "@/components/Game/Entity/voice" // import: **no preloadClips** -> **+ preloadClips**, mechanism: startLevel decodes the catch sounds ahead of time
import { ENT_H } from "@/components/Game/Entity/entityRenderer"
import { overlaps, type PlayerBox } from "./gameScene"
import { ELENA, RYUUKO, ROMAJI, levelsFor, type TrainingHud, type TrainingPhase } from "./training"
// a copy of training.ts's useTraining for the dodging quest: Ryuuko stands
// in the middle and doesn't throw, there's no wall, and blocks fly in from
// all 4 edges. training.ts itself is untouched; its exported pieces are reused

export const center = (w: number, h: number) => ({ x: w / 2, y: h / 2 })
// where Ryuuko stands (world px, center): the middle of the square island

export const PLAYER_GAP = 100
// px in y from Ryuuko to the player when a level starts; the original's 350
// would put the player near the edge of an island only one screen tall

const time = 60_000 //60s
const quota = 10
const maxHP = 10
const DAMAGE_SFX = '/_SFX/tookDamage.mp3'
const SPREAD = Math.PI / 4
const TARGET_CHANCE = 0.4
// copied from training.ts (not exported there): 60s per level, 10 catches to
// clear, 10 hp, the damage sound, ±45° throw spread, 40% target share

const EDGE_ANGLES = [Math.PI / 2, -Math.PI / 2, 0, Math.PI]
// the inward direction for each edge, in the order top, bottom, left, right.
// The angle is atan2-style with y pointing down: π/2 = down, -π/2 = up,
// 0 = right, π = left

type Block = { id: number, kana: string, x: number, y: number, vx: number, vy: number }

export function useDodgeTraining({ w, h, onLeave, kana = 'あ' }: { w: number, h: number, onLeave?: () => void, kana?: string }) {
    const [phase, setPhaseState] = useState<TrainingPhase>('intro')
    const phaseRef = useRef<TrainingPhase>('intro')
    const [failedLevel, setFailedLevel] = useState<0 | 1>(0)
    const [talkRequest, setTalkRequest] = useState<{ npc: number, key: number } | undefined>(undefined)

    const current = useRef(0)
    const hurtAt = useRef(-Infinity)
    const hp = useRef(maxHP)
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
    // same state layout as useTraining: phase is state (the NPC list depends
    // on it) mirrored in phaseRef; the per-frame game state lives in refs, so
    // the callbacks below stay stable

    const setPhase = useCallback((p: TrainingPhase) => {
        phaseRef.current = p
        setPhaseState(p)
        if (p !== 'play1' && p !== 'play2') blocks.current = []
    }, [])
    // updates the ref first and clears flying blocks when leaving play

    const [moveRequest, setMoveRequest] = useState<{ x: number, y: number, key: number } | undefined>(undefined)
    const talkTo = useCallback((npc: number) => setTalkRequest(r => ({ npc, key: (r?.key ?? 0) + 1 })), [])
    // key bumps so GameScene re-opens a talk / re-places the player each time

    const startLevel = useCallback((level: 0 | 1) => {
        current.current = 0
        hp.current = maxHP
        timeLeft.current = time
        spawnIn.current = 0
        blocks.current = []
        preloadClips([...levelsRef.current[level].pool.map(k => dialogUrl('ryuuko', k)), DAMAGE_SFX])
        // decodes this level's catch sounds (Ryuuko's clip for each kana in
        // the pool + the damage sound) before the first block arrives, so a
        // catch plays from memory instead of loading the mp3 mid-frame
        const c = center(sizeRef.current.w, sizeRef.current.h)
        setMoveRequest(r => ({ x: c.x, y: c.y + PLAYER_GAP, key: (r?.key ?? 0) + 1 }))
        setPhase(level === 0 ? 'play1' : 'play2')
    }, [setPhase])
    // resets the counters and places the player PLAYER_GAP below Ryuuko at
    // the center; spawnIn 0 throws the first block on the next tick

    const onTick = useCallback((dt: number, player: PlayerBox) => {
        const p = phaseRef.current
        if (p !== 'play1' && p !== 'play2') return
        const level: 0 | 1 = p === 'play1' ? 0 : 1
        const lv = levelsRef.current[level]
        const { w, h } = sizeRef.current
        timeLeft.current -= dt * 1000

        spawnIn.current -= dt
        if (spawnIn.current <= 0) {
            spawnIn.current += lv.every
            const others = lv.pool.filter(k => k !== lv.target)
            const kana = others.length === 0 || Math.random() < TARGET_CHANCE
                ? lv.target
                : others[Math.floor(Math.random() * others.length)]
            const edge = Math.floor(Math.random() * 4)
            const along = Math.random()
            const from = edge === 0 ? { x: along * w, y: 0 }
                : edge === 1 ? { x: along * w, y: h }
                : edge === 2 ? { x: 0, y: along * h }
                : { x: w, y: along * h }
            const angle = EDGE_ANGLES[edge] + (Math.random() * 2 - 1) * SPREAD
            blocks.current.push({ id: nextId.current++, kana, x: from.x, y: from.y, vx: Math.cos(angle) * lv.speed, vy: Math.sin(angle) * lv.speed })
        }
        // a throw every lv.every seconds from a random edge (top, bottom, left,
        // right) at a random point along it. The block starts exactly on the
        // edge, so the strict cull below (< 0 / > w) keeps it, then flies inward
        // along the edge's normal ±SPREAD; cos / sin keep lv.speed at any angle,
        // and even at 45° the inward part of the velocity is > 0, so it never
        // leaves through the edge it came from

        const s = CHAR_BLOCK_SIZE
        blocks.current = blocks.current.filter(b => {
            b.x += b.vx * dt
            b.y += b.vy * dt
            if (b.x < 0 || b.x > w || b.y < 0 || b.y > h) return false
            if (overlaps(player.x, player.y, player.w, player.h, { x: b.x - s / 2, y: b.y - s / 2, w: s, h: s })) {
                if (b.kana === lv.target) current.current++
                else {
                    hp.current--
                    hurtAt.current = performance.now()
                    playSfx(DAMAGE_SFX)
                }
                playLine(dialogUrl('ryuuko', b.kana))
                return false
            }
            return true
        })
        // same catch as useTraining: the target scores, anything else costs
        // 1 hp with the flash and damage sound; Ryuuko says what was caught.
        // Blocks that cross the island drop off at the far edge

        if (current.current >= quota) {
            if (level === 0) { setPhase('levelUp'); talkTo(RYUUKO) }
            else { setPhase('success'); talkTo(RYUUKO) }
        }
        else if (hp.current <= 0 || timeLeft.current <= 0) {
            setFailedLevel(level)
            setPhase('fail')
            talkTo(ELENA)
        }
        // quota 10 clears the level (level 1 -> Ryuuko's level-up talk, level 2
        // -> success); out of hp or time -> fail, Elena talks first
    }, [setPhase, talkTo])

    const failedRef = useRef(failedLevel)
    failedRef.current = failedLevel

    const onChoice = useCallback((npc: number, choice: number) => {
        const p = phaseRef.current
        if (npc === RYUUKO && p === 'again') {
            if (choice < levelsRef.current.length) startLevel(choice as 0 | 1)
            return
        }
        if (choice !== 0) {
            if (npc === ELENA && p === 'success') setPhase('again')
            else if (npc === RYUUKO && p === 'levelUp') { setPhase('break'); talkTo(ELENA) }
            return
        }
        if (npc === RYUUKO) {
            if (p === 'intro') startLevel(0)
            else if (p === 'levelUp' || p === 'break') startLevel(1)
            else if (p === 'fail') startLevel(failedRef.current)
        }
        else if (npc === ELENA && (p === 'fail' || p === 'success' || p === 'again' || p === 'break')) onLeaveRef.current?.()
    }, [startLevel, setPhase, talkTo])
    // the same dialog flow as useTraining: in 'again' Ryuuko's choice index is
    // the level; はい to Ryuuko starts / continues / retries, はい to Elena
    // leaves; いいえ moves success -> again and levelUp -> break

    const onTalkEnd = useCallback((npc: number) => {
        if (npc === RYUUKO && phaseRef.current === 'success') setPhase('again')
    }, [setPhase])
    // Ryuuko's おつかれさま！ ending moves to her replay offer

    const renderWorld = useCallback(() => createElement(Fragment, null,
        (phaseRef.current === 'play1' || phaseRef.current === 'play2') && createElement(TargetBubble, { key: 'target', kana: levelsRef.current[phaseRef.current === 'play1' ? 0 : 1].target, x: center(sizeRef.current.w, sizeRef.current.h).x, y: center(sizeRef.current.w, sizeRef.current.h).y, h: ENT_H }),
        ...blocks.current.map(b => createElement(CharBlock, { key: b.id, kana: b.kana, x: b.x, y: b.y }))
    ), [])
    // no wall line: only the target bubble over Ryuuko at the center (while
    // playing) and the flying blocks, read from the refs each frame

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
            hurtAt: hurtAt.current,
        }
    }, [])
    // a snapshot of the refs for the HUD's own rAF

    const playerLabel = useCallback((): string | undefined => {
        const p = phaseRef.current
        return p === 'play1' || p === 'play2' ? `${current.current}/${quota}` : undefined
    }, [])
    // current/quota on the player's name tag while a level runs

    return { phase, onTick, onChoice, onTalkEnd, renderWorld, getHud, playerLabel, talkRequest, moveRequest }
}
// usage: like useTraining, but no wallY is returned, so GameScene never
// clamps the player; the island builds its NPCs at center(w, h)
