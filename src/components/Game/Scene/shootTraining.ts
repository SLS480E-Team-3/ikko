'use client'

import { createElement, Fragment, useCallback, useRef, useState } from "react"
import CharBlock, { CHAR_BLOCK_SIZE, TargetBubble } from "@/components/Game/Entity/charBlock"
import { dialogUrl, playLine, playSfx } from "@/components/Game/Entity/voice"
import { BUBBLE_BOARDER, BUBBLE_BORDER_W } from "@/components/Game/Entity/dialogBubble"
import { ENT_H, ENT_W } from "@/components/Game/Entity/entityRenderer"
import { overlaps, type PlayerBox } from "./gameScene"
import { ELENA, RYUUKO, ROMAJI, levelsFor, playSpot, throwSpot, type TrainingHud, type TrainingPhase } from "./training"
// a copy of training.ts's useTraining with shooting added. The pieces
// training.ts exports (phases, NPC indices, spots, levels, romaji, hud type)
// are imported so both trainings stay in step; training.ts itself is untouched

const PLAYER_GAP = 350
const WALL_GAP = 300
const time = 60_000 //60s
const quota = 10
const maxHP = 10
const DAMAGE_SFX = '/_SFX/tookDamage.mp3'
const SPREAD = Math.PI / 4
const TARGET_CHANCE = 0.4
// training.ts keeps these private, so they're copied with the same values:
// player start / wall distance below Ryuuko, level length, catches to clear,
// hp, the damage sound, the throw spread and level 2's target share

const BULLET_W = 5
const BULLET_H = 8
const BULLET_SPEED = 500
const BULLET_COLOR = 'red'
const AMMO_MAX = 5
// a bullet is a 5 x 8 px red rectangle (world px) flying straight up at 500 px/s
// AMMO_MAX: the most bullets the player can hold; a level starts with none

export const RYUUKO_W = ENT_W * 1.5
export const RYUUKO_H = ENT_H * 1.5
// Ryuuko's body in this mode is 1.5x the default entity (18 x 30); exported so
// shootQuestIsland draws her at the same size the bullets hit

const RYUUKO_SPEED = 80
const RYUUKO_RANGE = 120
// during a level Ryuuko walks left and right at 80 px/s, up to 120 px either
// side of her play spot (world px), so she stays on a phone-width screen

type Block = { id: number, kana: string, x: number, y: number, vx: number, vy: number }
type Bullet = { id: number, x: number, y: number }
// both center-anchored in world px

export function useShootTraining({ w, h, onLeave, kana = 'あ' }: { w: number, h: number, onLeave?: () => void, kana?: string }) {
    const [phase, setPhaseState] = useState<TrainingPhase>('intro')
    const phaseRef = useRef<TrainingPhase>('intro')
    const [failedLevel, setFailedLevel] = useState<0 | 1>(0)
    const [talkRequest, setTalkRequest] = useState<{ npc: number, key: number } | undefined>(undefined)
    // phase is state for the parent's NPC list; phaseRef mirrors it for the
    // stable callbacks, same as useTraining

    const current = useRef(0)
    const hurtAt = useRef(-Infinity)
    const hp = useRef(maxHP)
    const timeLeft = useRef(time)
    const spawnIn = useRef(0)
    const blocks = useRef<Block[]>([])
    const bullets = useRef<Bullet[]>([])
    const ryuukoDx = useRef(0)
    const ryuukoDir = useRef(1)
    // ryuukoDx: her offset from playSpot's x; ryuukoDir: +1 walking right, -1 left
    const ammo = useRef(0) // ammo: **unlimited** -> **0..AMMO_MAX**, mechanism: onShoot spends one, a right catch / a wrong block shot gives one
    const playerAt = useRef<PlayerBox | undefined>(undefined)
    const nextId = useRef(0)
    const sizeRef = useRef({ w, h })
    sizeRef.current = { w, h }
    const onLeaveRef = useRef(onLeave)
    onLeaveRef.current = onLeave
    const levelsRef = useRef(levelsFor(kana))
    if (levelsRef.current[0].target !== kana) levelsRef.current = levelsFor(kana)
    // per-frame state in refs like useTraining. bullets: the ones in flight
    // (they share nextId with the blocks, only used as React keys);
    // playerAt: the player's box from the last tick, where onShoot fires from

    const setPhase = useCallback((p: TrainingPhase) => {
        phaseRef.current = p
        setPhaseState(p)
        if (p !== 'play1' && p !== 'play2') { blocks.current = []; bullets.current = [] }
    }, [])
    // leaving play clears the flying blocks and the bullets

    const [moveRequest, setMoveRequest] = useState<{ x: number, y: number, key: number } | undefined>(undefined)

    const talkTo = useCallback((npc: number) => setTalkRequest(r => ({ npc, key: (r?.key ?? 0) + 1 })), [])

    const startLevel = useCallback((level: 0 | 1) => {
        current.current = 0
        hp.current = maxHP
        timeLeft.current = time
        spawnIn.current = 0
        blocks.current = []
        bullets.current = []
        ryuukoDx.current = 0
        ryuukoDir.current = Math.random() < 0.5 ? 1 : -1
        // each level starts with her centered, walking a random way
        ammo.current = 0 // start: **no ammo count** -> **0 bullets**, mechanism: the player has to catch the target before the first shot
        const from = throwSpot(sizeRef.current.w, sizeRef.current.h)
        setMoveRequest(r => ({ x: from.x, y: from.y + PLAYER_GAP, key: (r?.key ?? 0) + 1 }))
        setPhase(level === 0 ? 'play1' : 'play2')
    }, [setPhase])
    // resets counters, blocks and bullets, then places the player PLAYER_GAP
    // below Ryuuko

    const onShoot = useCallback((): boolean => {
        const p = phaseRef.current
        const player = playerAt.current
        if (p !== 'play1' && p !== 'play2') return false
        if (!player || ammo.current <= 0) return true // empty: **(fires anyway)** -> **nothing, still handled**, mechanism: true keeps Space from talking and a second finger from pinching mid-level
        ammo.current--
        bullets.current.push({ id: nextId.current++, x: player.x, y: player.y - player.h / 2 - BULLET_H / 2 })
        return true
    }, [])
    // GameScene calls this on Space / a tap. Only a running level fires: a
    // bullet starts just above the player's top edge (player.x / y are the
    // center). false outside a level tells GameScene to talk / walk instead

    const onTick = useCallback((dt: number, player: PlayerBox) => {
        playerAt.current = player
        const p = phaseRef.current
        if (p !== 'play1' && p !== 'play2') return
        const level: 0 | 1 = p === 'play1' ? 0 : 1
        const lv = levelsRef.current[level]
        const { w, h } = sizeRef.current
        timeLeft.current -= dt * 1000

        ryuukoDx.current += ryuukoDir.current * RYUUKO_SPEED * dt
        if (Math.abs(ryuukoDx.current) >= RYUUKO_RANGE) {
            ryuukoDx.current = Math.sign(ryuukoDx.current) * RYUUKO_RANGE
            ryuukoDir.current = -ryuukoDir.current
        }
        const ryuuko = { x: playSpot(w, h).x + ryuukoDx.current, y: playSpot(w, h).y }
        // she walks first, clamped at +-RYUUKO_RANGE where she turns around;
        // ryuuko is her center this frame, used by the throw, the hitbox and
        // (through getRyuukoX) her body and the target bubble

        spawnIn.current -= dt
        if (spawnIn.current <= 0) {
            spawnIn.current += lv.every
            const others = lv.pool.filter(k => k !== lv.target)
            const kana = others.length === 0 || Math.random() < TARGET_CHANCE
                ? lv.target
                : others[Math.floor(Math.random() * others.length)]
            const from = ryuuko // from: **playSpot** -> **ryuuko**, mechanism: blocks leave her hands where she is now
            const angle = (Math.random() * 2 - 1) * SPREAD
            blocks.current.push({ id: nextId.current++, kana, x: from.x, y: from.y, vx: Math.sin(angle) * lv.speed, vy: Math.cos(angle) * lv.speed })
        }
        // throws exactly as useTraining: every lv.every s, straight down +- SPREAD

        const s = CHAR_BLOCK_SIZE
        for (const b of blocks.current) {
            b.x += b.vx * dt
            b.y += b.vy * dt
        }
        bullets.current = bullets.current.filter(u => {
            u.y -= BULLET_SPEED * dt
            if (u.y < 0) return false
            const hit = blocks.current.findIndex(b => overlaps(u.x, u.y, BULLET_W, BULLET_H, { x: b.x - s / 2, y: b.y - s / 2, w: s, h: s }))
            if (hit !== -1) {
                if (blocks.current[hit].kana !== lv.target) ammo.current = Math.min(AMMO_MAX, ammo.current + 1) // wrong block shot: **just destroyed** -> **+1 bullet**, mechanism: capped at AMMO_MAX
                blocks.current.splice(hit, 1)
                return false
            }
            if (overlaps(u.x, u.y, BULLET_W, BULLET_H, { x: ryuuko.x - RYUUKO_W / 2, y: ryuuko.y - RYUUKO_H / 2, w: RYUUKO_W, h: RYUUKO_H })) { // hitbox: **ENT_W x ENT_H** -> **RYUUKO_W x RYUUKO_H**, mechanism: matches her 1.5x body
                hp.current--
                current.current++
                return false
            } // Ryuuko: **not a target** -> **hit costs her 1 hp**, mechanism: her body box (RYUUKO_W x RYUUKO_H centered on playSpot, where npcs.ts puts her in a level); current counts hits for the clear check
            return true
        })
        // blocks move first, then each bullet moves up and is tested against
        // them: overlaps() takes the bullet's center + size and the block's
        // top-left box. A block hit removes both (a wrong kana refunds +1
        // bullet); otherwise a hit on Ryuuko costs her 1 hp; a bullet past
        // the island's top drops

        blocks.current = blocks.current.filter(b => {
            if (b.x < 0 || b.x > w || b.y < 0 || b.y > h) return false
            if (overlaps(player.x, player.y, player.w, player.h, { x: b.x - s / 2, y: b.y - s / 2, w: s, h: s })) {
                if (b.kana === lv.target) ammo.current = Math.min(AMMO_MAX, ammo.current + 1) // right catch: **+1 score** -> **+1 bullet**, mechanism: capped at AMMO_MAX
                else { // wrong catch: **-1 hp + flash + sound** -> **flash + sound only**, mechanism: hp is Ryuuko's now, so a wrong catch just warns
                    hurtAt.current = performance.now()
                    playSfx(DAMAGE_SFX)
                }
                playLine(dialogUrl('ryuuko', b.kana))
                return false
            }
            return true
        })
        // the player catch pass from useTraining, run on the blocks the
        // bullets left: the target adds a bullet, anything else flashes

        if (hp.current <= 0) { // clear: **current >= quota** -> **Ryuuko's hp 0**, mechanism: 10 bullet hits on her body (maxHP)
            if (level === 0) { setPhase('levelUp'); talkTo(RYUUKO) }
            else { setPhase('success'); talkTo(RYUUKO) }
        }
        else if (timeLeft.current <= 0) { // fail: **player hp 0 or time out** -> **time out only**, mechanism: the player has no hp in this mode
            setFailedLevel(level)
            setPhase('fail')
            talkTo(ELENA)
        }
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
    // Ryuuko / Elena's choices, unchanged from useTraining

    const onTalkEnd = useCallback((npc: number) => {
        if (npc === RYUUKO && phaseRef.current === 'success') setPhase('again')
    }, [setPhase])

    const renderWorld = useCallback(() => createElement(Fragment, null,
        (phaseRef.current === 'play1' || phaseRef.current === 'play2') && createElement('div', { key: 'wall', style: { position: 'absolute', left: 0, top: throwSpot(sizeRef.current.w, sizeRef.current.h).y + WALL_GAP - BUBBLE_BORDER_W / 2, width: sizeRef.current.w, height: BUBBLE_BORDER_W, background: BUBBLE_BOARDER, pointerEvents: 'none' } }),
        (phaseRef.current === 'play1' || phaseRef.current === 'play2') && createElement(TargetBubble, { key: 'target', kana: levelsRef.current[phaseRef.current === 'play1' ? 0 : 1].target, x: playSpot(sizeRef.current.w, sizeRef.current.h).x + ryuukoDx.current, y: playSpot(sizeRef.current.w, sizeRef.current.h).y, h: RYUUKO_H }), // x: **playSpot x** -> **+ ryuukoDx**, mechanism: the bubble follows her walk // h: **ENT_H** -> **RYUUKO_H**, mechanism: the bubble sits above her taller body
        ...blocks.current.map(b => createElement(CharBlock, { key: b.id, kana: b.kana, x: b.x, y: b.y })),
        ...bullets.current.map(u => createElement('div', { key: `bullet${u.id}`, style: { position: 'absolute', left: u.x - BULLET_W / 2, top: u.y - BULLET_H / 2, width: BULLET_W, height: BULLET_H, background: BULLET_COLOR, pointerEvents: 'none' } })),
    ), [])
    // wall, target bubble and blocks as in useTraining, then the bullets on
    // top: absolute divs placed by their center, ignoring pointers so taps
    // still reach the stick

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

    const playerLabel = useCallback((): string | undefined => {
        const p = phaseRef.current
        return p === 'play1' || p === 'play2' ? `${ammo.current}/${AMMO_MAX}` : undefined // label: **caught / quota** -> **bullets / AMMO_MAX**, mechanism: the tag over the player shows the ammo
    }, [])

    const getRyuukoX = useCallback((): number | undefined => {
        const p = phaseRef.current
        return p === 'play1' || p === 'play2' ? playSpot(sizeRef.current.w, sizeRef.current.h).x + ryuukoDx.current : undefined
    }, [])
    // her walking x during a level, undefined otherwise (then she stands where
    // npcs.ts puts her). shootQuestIsland reads it through a getter on her ent

    const wallY = phase === 'play1' || phase === 'play2' ? throwSpot(w, h).y + WALL_GAP : undefined

    return { phase, wallY, onTick, onChoice, onTalkEnd, renderWorld, getHud, playerLabel, talkRequest, moveRequest, onShoot, getRyuukoX }
}
// useTraining's return plus onShoot, which shootQuestIsland.tsx passes to
// GameScene's onShoot prop
