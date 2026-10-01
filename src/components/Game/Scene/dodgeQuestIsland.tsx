'use client'

import { CSSProperties, ReactNode, useEffect, useReducer, useRef, useState } from "react"
import GameScene, { questBg } from "./gameScene"
import { TrainingHud } from "./training"
import { PLAYER_GAP, center, useDodgeTraining } from "./dodgeTraining"
import { questIslandNpcs } from "../npcs/npcs"
import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W } from "../Entity/dialogBubble"
import { QUEST_BGM, playBgm, stopBgm } from "../Entity/voice"
// a copy of questIsland.tsx for the dodging quest: a square island, Ryuuko
// and Elena at its center, no wall. questIsland.tsx itself is untouched

const TIMER_H = 8
const HP_H = TIMER_H * 3
const TIMER_TOP = 40
const HP_BOTTOM = 40
const HP_COLOR = '#ff8a8a'
const FLASH_MS = 300
const FLASH_OPACITY = 0.6
// same HUD sizes / colors / damage flash as questIsland.tsx (copied, since
// that file doesn't export them)

function Bar({ frac, color, style }: { frac: number, color: string, style: CSSProperties }) {
    return (
        <div style={{ position: 'absolute', zIndex: 2, boxSizing: 'border-box', border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, background: BUBBLE_BG, pointerEvents: 'none', ...style }}>
            <div style={{ width: `${frac * 100}%`, height: '100%', background: color }} />
        </div>
    )
}
// bordered track with a left-anchored fill, as in questIsland.tsx

function Hud({ getHud }: { getHud: () => TrainingHud }) {
    const [, force] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        let raf = requestAnimationFrame(function loop() { force(); raf = requestAnimationFrame(loop) })
        return () => cancelAnimationFrame(raf)
    }, [])
    const hud = getHud()
    const flash = FLASH_OPACITY * Math.max(0, 1 - (performance.now() - hud.hurtAt) / FLASH_MS)
    const overlay = flash > 0 && <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: HP_COLOR, opacity: flash, pointerEvents: 'none' }} />
    if (!hud.playing) return overlay || null
    return (
        <>
            {overlay}
            <Bar frac={hud.timeFrac} color="cyan" style={{ top: TIMER_TOP, left: '5%', width: '90%', height: TIMER_H }} />
            <Bar frac={hud.hp / hud.maxHP} color={HP_COLOR} style={{ bottom: HP_BOTTOM, left: '5%', width: '90%', height: HP_H }} />
        </>
    )
}
// questIsland.tsx's HUD: its own rAF re-reads getHud() each frame for the
// damage flash, the cyan timer strip and the hp bar

function Training({ w, h, onLeave, kana, sensitivity, children }: { w: number, h: number, onLeave: () => void, kana?: string, sensitivity?: number, children?: ReactNode }) {
    const t = useDodgeTraining({ w, h, onLeave, kana })
    const c = center(w, h)
    const npcs = questIslandNpcs(w, h, t.phase, t.getHud().target).map(n => ({ ...n, ent: { ...n.ent, y: c.y } })) // args: **(w, h, phase)** -> **+ getHud().target**, mechanism: the level target kana, so Ryuuko's intro names it
    // the shared cast moved to the center row: a shallow copy of each ent
    // with y = h / 2, so npcs.ts keeps its throwSpot y for the other quests.
    // x is untouched, so Ryuuko stays at w / 2 (+40 in fail) and Elena beside her
    const bgm = t.phase === 'success' || t.phase === 'again' ? QUEST_BGM.clear : t.phase === 'fail' ? QUEST_BGM.fail : undefined
    useEffect(() => bgm ? playBgm(bgm) : undefined, [bgm])
    return (
        <>
            <GameScene bgProps={{ ...questBg(w, h), y: c.y + PLAYER_GAP }} npcs={npcs} onChoice={t.onChoice} onTalkEnd={t.onTalkEnd} onTick={t.onTick} renderWorld={t.renderWorld} talkRequest={t.talkRequest} moveRequest={t.moveRequest} playerLabel={t.playerLabel} sensitivity={sensitivity} />
            <Hud getHud={t.getHud} />
            {(t.phase === 'success' || t.phase === 'again') && children}
        </>
    )
}
// questIsland.tsx's Training on useDodgeTraining. No wallY is passed, so the
// player can walk anywhere; bgProps.y (the player's spawn / camera start) is
// PLAYER_GAP below Ryuuko instead of questBg's tall-island default

export function DodgeQuestIsland({ onLeave, kana, sensitivity, children }: { onLeave: () => void, kana?: string, sensitivity?: number, children?: ReactNode }) {
    const boxRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState<{ w: number, h: number }>()
    useEffect(() => { stopBgm() }, [])
    useEffect(() => {
        const box = boxRef.current
        const h = Math.round(box?.clientHeight || window.innerHeight)
        setSize({ w: h, h })
    }, [])
    return (
        <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%', background: BUBBLE_BG }}>
            {size && <Training w={size.w} h={size.h} onLeave={onLeave} kana={kana} sensitivity={sensitivity}>{children}</Training>}
        </div>
    )
}
// same shell as QuestIsland (stops any island BGM, measures the box once
// after mount), but the island is square: both sides are the screen height
