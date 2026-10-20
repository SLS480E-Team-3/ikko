'use client'

import { createElement, Fragment, useCallback, useRef, useState } from "react"
import { dialogUrl, playLine, playSfx, preloadClips } from "@/components/Game/Entity/voice"
import { BUBBLE_BOARDER, BUBBLE_BORDER_W, BUBBLE_SHADOW } from "@/components/Game/Entity/dialogBubble"
import { audioName } from "@/components/Game/npcs/toNPCProps"
import { overlaps, type PlayerBox } from "./gameScene"
import { ELENA, RYUUKO, playSpot, throwSpot, type TrainingPhase } from "./training"
import { DECOYS, fullSentence, sentencesFor, shuffle, signText, type Sentence } from "../particles"
// a copy of training.ts (the catch quest) for island 3's particle quest
// (docs/island-3.spec.json F-2): the same phases, levels, timer, hp and
// quota, but the "target" is the particle that fills the current sentence's
// blank, and each right catch moves to the next sentence. training.ts itself
// is untouched; its phase type, NPC indices and spots are imported so
// questIslandNpcs (npcs.ts) works with this hook unchanged

const PLAYER_GAP = 350
const WALL_GAP = 300
// same gaps as training.ts (not exported there): the player starts 350px
// below Ryuuko, and the wall they can't cross is 300px below her

const time = 60_000 //60s
const quota = 10
const maxHP = 10
const DAMAGE_SFX = '/_SFX/tookDamage.mp3'
// the catch quest's run shape (D-5): 60 s, 10 right catches per level, 10 hp

export type ParticleLevel = { pool: string[], speed: number, every: number, answerChance: number }
// one level: the particles that can be thrown, how fast (px/s), seconds
// between throws, and the share of throws that are the current answer

export const PARTICLE_LEVELS: ParticleLevel[] = [
    { pool: ['に', 'で'], speed: 60, every: 1.4, answerChance: 0.5 },
    { pool: ['に', 'で', ...DECOYS], speed: 100, every: 0.9, answerChance: 0.4 },
]
// level 1: only に / で, slower than the catch quest (60 px/s every 1.4 s)
// so there is time to read the sign; level 2: faster and を / へ decoys
// added (D-3). Two levels like LEVELS in training.ts, so npcs.ts's
// LEVEL(LEVELS) replay choices still match

const SPREAD = Math.PI / 4
// max angle (45°) a throw leans left or right of straight down

export const WOOD_W = 56
export const WOOD_H = 40
const WOOD_FONT = 28
const WOOD_FILL = '#c68a4f'
const WOOD_GRAIN = '#b3773e'
const WOOD_EDGE = '#5c3517'
const WOOD_TEXT = '#2e1a0b'
// a wood piece in world px: a plank a bit wider than tall, the particle at
// 28px. Fill / grain / edge are light, mid and dark browns

function WoodBlock({ kana, x, y }: { kana: string, x: number, y: number }) {
    return createElement('div', {
        style: {
            position: 'absolute',
            left: x,
            top: y,
            width: WOOD_W,
            height: WOOD_H,
            transform: 'translate(-50%, -50%)',
            boxSizing: 'border-box',
            border: `${BUBBLE_BORDER_W}px solid ${WOOD_EDGE}`,
            borderRadius: 6,
            background: `repeating-linear-gradient(0deg, ${WOOD_FILL} 0 6px, ${WOOD_GRAIN} 6px 8px)`,
            color: WOOD_TEXT,
            boxShadow: `2px 2px 0 ${BUBBLE_SHADOW}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: WOOD_FONT,
            fontWeight: 700,
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: Math.round(y + WOOD_H / 2),
        },
    }, kana)
}
// a wood-styled CharBlock (Entity/charBlock.tsx is untouched): center-
// anchored the same way so overlaps() and the drawing agree, zIndex at the
// bottom edge like every entity. The grain is a repeating horizontal
// stripe gradient (6px light, 2px darker), the border a dark brown at the
// bubble border's width, rounded a little so it reads as a plank, not a
// crate. createElement keeps this file .ts like training.ts

export const SUPPLIES = ['🪵', '🍎', '🍄', '🐟', '🌰']
// what a right catch earns, in turn: wood, apple, mushroom, fish, nut. The
// HUD shows the latest one next to the count (D-6: counter only, not saved)

type Block = { id: number, kana: string, x: number, y: number, vx: number, vy: number }

export type ParticleHud = { sign: string, en: string, answer: string, current: number, quota: number, hp: number, maxHP: number, secondsLeft: number, timeFrac: number, playing: boolean, hurtAt: number, supplies: number, supplyIcon: string, gotAt: number }
// training.ts's TrainingHud with the sign (sentence with ＿ and its English)
// in place of target / romaji, plus the supply counter: count, latest icon
// and performance.now() of the last right catch (for a small pop)

export function useParticleTraining({ w, h, onLeave, kana = 'mix' }: { w: number, h: number, onLeave?: () => void, kana?: string }) {
    const [phase, setPhaseState] = useState<TrainingPhase>('intro')
    const phaseRef = useRef<TrainingPhase>('intro')
    const [failedLevel, setFailedLevel] = useState<0 | 1>(0)
    const [talkRequest, setTalkRequest] = useState<{ npc: number, key: number } | undefined>(undefined)
    // as in training.ts: phase is state for the parent's NPC list, phaseRef
    // the synchronous copy the stable callbacks read

    const current = useRef(0)
    const hurtAt = useRef(-Infinity)
    const hp = useRef(maxHP)
    const timeLeft = useRef(time)
    const spawnIn = useRef(0)
    const blocks = useRef<Block[]>([])
    const nextId = useRef(0)
    const supplies = useRef(0)
    const gotAt = useRef(-Infinity)
    const sizeRef = useRef({ w, h })
    sizeRef.current = { w, h }
    const onLeaveRef = useRef(onLeave)
    onLeaveRef.current = onLeave
    // per-frame state in refs, as in training.ts; supplies / gotAt are the
    // HUD's supply counter and the time of its last +1

    const poolRef = useRef<{ kana: string, list: Sentence[] }>({ kana, list: sentencesFor(kana) })
    if (poolRef.current.kana !== kana) poolRef.current = { kana, list: sentencesFor(kana) }
    const queue = useRef<Sentence[]>(shuffle(poolRef.current.list))
    const qi = useRef(0)
    // the quest's sentences (particles.ts sentencesFor: に, で or both) and a
    // shuffled queue walked by qi; rebuilt only when kana changes

    const sentence = () => queue.current[qi.current % queue.current.length]
    const nextSentence = useCallback(() => {
        qi.current++
        if (qi.current >= queue.current.length) {
            const last = queue.current[queue.current.length - 1]
            let q = shuffle(poolRef.current.list)
            if (q.length > 1 && q[0] === last) q = [...q.slice(1), q[0]]
            queue.current = q
            qi.current = 0
        }
    }, [])
    // the next sentence; at the end of the queue a new shuffle starts, its
    // first sentence moved to the back if it is the one just shown, so the
    // sign never repeats right away

    const setPhase = useCallback((p: TrainingPhase) => {
        phaseRef.current = p
        setPhaseState(p)
        if (p !== 'play1' && p !== 'play2') blocks.current = []
    }, [])

    const [moveRequest, setMoveRequest] = useState<{ x: number, y: number, key: number } | undefined>(undefined)

    const talkTo = useCallback((npc: number) => setTalkRequest(r => ({ npc, key: (r?.key ?? 0) + 1 })), [])

    const startLevel = useCallback((level: 0 | 1) => {
        current.current = 0
        hp.current = maxHP
        timeLeft.current = time
        spawnIn.current = 0
        blocks.current = []
        if (level === 0) supplies.current = 0
        queue.current = shuffle(poolRef.current.list)
        qi.current = 0
        preloadClips([
            ...poolRef.current.list.map(s => dialogUrl('ryuuko', audioName(fullSentence(s)))),
            ...PARTICLE_LEVELS[level].pool.map(k => dialogUrl('ryuuko', audioName(k))),
            DAMAGE_SFX,
        ])
        const from = throwSpot(sizeRef.current.w, sizeRef.current.h)
        setMoveRequest(r => ({ x: from.x, y: from.y + PLAYER_GAP, key: (r?.key ?? 0) + 1 }))
        setPhase(level === 0 ? 'play1' : 'play2')
    }, [setPhase])
    // training.ts's startLevel plus: a fresh shuffled sentence queue each
    // level, the supply counter reset on a run from level 1 (a level-2 retry
    // keeps it), and the preload covers every sentence clip of the pool and
    // the particle clips of this level, so a catch plays from memory

    const onTick = useCallback((dt: number, player: PlayerBox) => {
        const p = phaseRef.current
        if (p !== 'play1' && p !== 'play2') return
        const level: 0 | 1 = p === 'play1' ? 0 : 1
        const lv = PARTICLE_LEVELS[level]
        const { w, h } = sizeRef.current
        timeLeft.current -= dt * 1000

        spawnIn.current -= dt
        if (spawnIn.current <= 0) {
            spawnIn.current += lv.every
            const answer = sentence().answer
            const others = lv.pool.filter(k => k !== answer)
            const kana = others.length === 0 || Math.random() < lv.answerChance
                ? answer
                : others[Math.floor(Math.random() * others.length)]
            const from = playSpot(w, h)
            const angle = (Math.random() * 2 - 1) * SPREAD
            blocks.current.push({ id: nextId.current++, kana, x: from.x, y: from.y, vx: Math.sin(angle) * lv.speed, vy: Math.cos(angle) * lv.speed })
        }
        // a throw every lv.every seconds, straight down +- SPREAD, as in
        // training.ts. answerChance of the throws are the current sentence's
        // answer, the rest a random other particle of the level's pool (level
        // 1: the other of に / で; level 2: that or を / へ)

        blocks.current = blocks.current.filter(b => {
            b.x += b.vx * dt
            b.y += b.vy * dt
            if (b.x < 0 || b.x > w || b.y < 0 || b.y > h) return false
            if (overlaps(player.x, player.y, player.w, player.h, { x: b.x - WOOD_W / 2, y: b.y - WOOD_H / 2, w: WOOD_W, h: WOOD_H })) {
                const s = sentence()
                if (b.kana === s.answer) {
                    current.current++
                    supplies.current++
                    gotAt.current = performance.now()
                    playLine(dialogUrl('ryuuko', audioName(fullSentence(s))))
                    nextSentence()
                }
                else {
                    hp.current--
                    hurtAt.current = performance.now()
                    playSfx(DAMAGE_SFX)
                    playLine(dialogUrl('ryuuko', audioName(b.kana)))
                }
                return false
            }
            return true
        })
        // the catch test of training.ts on the plank's own box. Right (the
        // current sentence's answer): +1 to the quota and the supply counter,
        // Ryuuko reads the whole sentence, the sign moves on. Wrong (the other
        // answer or a decoy): -1 hp, the damage sound plus Ryuuko saying the
        // caught particle, the same sentence stays (D-8). Blocks already in the
        // air are judged against the sentence shown when they are caught

        if (current.current >= quota) {
            if (level === 0) { setPhase('levelUp'); talkTo(RYUUKO) }
            else { setPhase('success'); talkTo(RYUUKO) }
        }
        else if (hp.current <= 0 || timeLeft.current <= 0) {
            setFailedLevel(level)
            setPhase('fail')
            talkTo(ELENA)
        }
        // same ending as training.ts: quota -> level-up talk / おつかれさま！,
        // out of hp or time -> 'fail' with Elena first
    }, [setPhase, talkTo, nextSentence])

    const failedRef = useRef(failedLevel)
    failedRef.current = failedLevel

    const onChoice = useCallback((npc: number, choice: number) => {
        const p = phaseRef.current
        if (npc === RYUUKO && p === 'again') {
            if (choice < PARTICLE_LEVELS.length) startLevel(choice as 0 | 1)
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
    // training.ts's onChoice unchanged: Ryuuko's はい starts / continues /
    // retries, her 'again' choices are the levels, Elena's はい leaves

    const onTalkEnd = useCallback((npc: number) => {
        if (npc === RYUUKO && phaseRef.current === 'success') setPhase('again')
    }, [setPhase])

    const renderWorld = useCallback(() => createElement(Fragment, null,
        (phaseRef.current === 'play1' || phaseRef.current === 'play2') && createElement('div', { key: 'wall', style: { position: 'absolute', left: 0, top: throwSpot(sizeRef.current.w, sizeRef.current.h).y + WALL_GAP - BUBBLE_BORDER_W / 2, width: sizeRef.current.w, height: BUBBLE_BORDER_W, background: BUBBLE_BOARDER, pointerEvents: 'none' } }),
        ...blocks.current.map(b => createElement(WoodBlock, { key: b.id, kana: b.kana, x: b.x, y: b.y }))
    ), [])
    // the wall line and the flying wood pieces in world px. No TargetBubble
    // over Ryuuko: the answer is hidden, the sentence sign in the HUD asks

    const getHud = useCallback((): ParticleHud => {
        const p = phaseRef.current
        const s = sentence()
        return {
            sign: signText(s),
            en: s.en,
            answer: s.answer,
            current: current.current,
            quota,
            hp: hp.current,
            maxHP,
            secondsLeft: Math.max(0, Math.ceil(timeLeft.current / 1000)),
            timeFrac: Math.min(1, Math.max(0, timeLeft.current / time)),
            playing: p === 'play1' || p === 'play2',
            hurtAt: hurtAt.current,
            supplies: supplies.current,
            supplyIcon: SUPPLIES[Math.max(0, supplies.current - 1) % SUPPLIES.length],
            gotAt: gotAt.current,
        }
    }, [])
    // a snapshot from the refs, read by the island's HUD each frame. The
    // supply icon is the one earned last (wood first)

    const playerLabel = useCallback((): string | undefined => {
        const p = phaseRef.current
        return p === 'play1' || p === 'play2' ? `${current.current}/${quota}` : undefined
    }, [])

    const wallY = phase === 'play1' || phase === 'play2' ? throwSpot(w, h).y + WALL_GAP : undefined

    return { phase, failedLevel, wallY, onTick, onChoice, onTalkEnd, renderWorld, getHud, playerLabel, talkRequest, moveRequest }
}
// usage: like useTraining; pass the callbacks to GameScene and build the
// cast with questIslandNpcs(w, h, phase, targetFor(kana), failedLevel)
