'use client'

import { CSSProperties, ReactNode, useEffect, useReducer, useRef, useState } from "react"
import GameScene, { questBg } from "./gameScene"
import { useParticleTraining, type ParticleHud } from "./particleTraining"
import { questIslandNpcs } from "../npcs/npcs"
import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W } from "../Entity/dialogBubble"
import { stopBgm } from "../Entity/voice"
import { HIROKO_DX, useMergedTalk, useTutorial, type TutorialProps } from "./tutorial"
import { targetFor } from "../particles"
// a copy of questIsland.tsx (the catch quest's shell) for island 3's
// particle quest (docs/island-3.spec.json F-2), with the sentence sign from
// leftRightQuestIsland.tsx and a supply counter added to the HUD. Both
// source files are untouched

const TIMER_H = 8
const HP_H = TIMER_H * 3
const HP_BOTTOM = 40
const TIMER_BOTTOM = HP_BOTTOM + HP_H + 8
const HP_COLOR = '#ff8a8a'
const FLASH_MS = 300
const FLASH_OPACITY = 0.6
// questIsland.tsx's bars and damage flash, except the timer strip sits 8px
// above the hp bar instead of 40px under the top, so the top of the screen
// is free for the sentence sign
const SIGN_TOP = 8
const SIGN_W = 200
const SIGN_FONT = 26
// the sign's distance from the screen top, its minimum width and its
// sentence font (screen px); the longest sentence (11 kana) fits a phone
const SUPPLY_TOP = SIGN_TOP
const SUPPLY_RIGHT = 8
const POP_MS = 250
// the supply counter's corner (screen px) and how long its icon pops after a +1

function Bar({ frac, color, style }: { frac: number, color: string, style: CSSProperties }) {
    return (
        <div style={{ position: 'absolute', zIndex: 2, boxSizing: 'border-box', border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, background: BUBBLE_BG, pointerEvents: 'none', ...style }}>
            <div style={{ width: `${frac * 100}%`, height: '100%', background: color }} />
        </div>
    )
}
// bordered track with a left-anchored fill, as in questIsland.tsx

function Hud({ getHud }: { getHud: () => ParticleHud }) {
    const [, force] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        let raf = requestAnimationFrame(function loop() { force(); raf = requestAnimationFrame(loop) })
        return () => cancelAnimationFrame(raf)
    }, [])
    const hud = getHud()
    const flash = FLASH_OPACITY * Math.max(0, 1 - (performance.now() - hud.hurtAt) / FLASH_MS)
    const overlay = flash > 0 && <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: HP_COLOR, opacity: flash, pointerEvents: 'none' }} />
    if (!hud.playing) return overlay || null
    const pop = 1 + 0.4 * Math.max(0, 1 - (performance.now() - hud.gotAt) / POP_MS)
    return (
        <>
            {overlay}
            <div style={{ position: 'absolute', zIndex: 2, top: SIGN_TOP, left: '50%', transform: 'translateX(-50%)', minWidth: SIGN_W, maxWidth: '76%', padding: '6px 12px', boxSizing: 'border-box', border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, background: BUBBLE_BG, color: BUBBLE_BOARDER, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2, pointerEvents: 'none' }}>
                <div style={{ fontSize: SIGN_FONT, whiteSpace: 'nowrap' }}>{hud.sign}</div>
                <div style={{ fontSize: 13, textAlign: 'center' }}>{hud.en}</div>
            </div>
            {/* sign: copied from leftRightQuestIsland.tsx's word sign (same bubble colors / border, centered at the top, screen px), with two lines: the hiragana sentence with ＿ for the blank, and its English (no romaji line, D-7). maxWidth leaves room for the supply counter on the right; the English wraps if long */}
            <div style={{ position: 'absolute', zIndex: 2, top: SUPPLY_TOP, right: SUPPLY_RIGHT, padding: '4px 8px', boxSizing: 'border-box', border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, background: BUBBLE_BG, color: BUBBLE_BOARDER, display: 'flex', alignItems: 'center', gap: 4, fontSize: 16, lineHeight: 1, pointerEvents: 'none' }}>
                <span style={{ display: 'inline-block', transform: `scale(${pop})` }}>{hud.supplyIcon}</span>
                <span>{hud.supplies}</span>
            </div>
            {/* supplies: the latest earned icon (emoji) and the count in a small bubble-styled box at the top right; the icon scales up 40% on a +1 and shrinks back over POP_MS, read from gotAt each frame */}
            <Bar frac={hud.timeFrac} color="cyan" style={{ bottom: TIMER_BOTTOM, left: '5%', width: '90%', height: TIMER_H }} />
            <Bar frac={hud.hp / hud.maxHP} color={HP_COLOR} style={{ bottom: HP_BOTTOM, left: '5%', width: '90%', height: HP_H }} />
        </>
    )
}
// questIsland.tsx's HUD (own rAF re-reading getHud each frame, damage flash,
// timer and hp bars) plus the sentence sign and the supply counter, drawn
// only while a level is played

function Training({ w, h, onLeave, kana, sensitivity, tutorial, children }: { w: number, h: number, onLeave: () => void, kana?: string, sensitivity?: number, tutorial?: TutorialProps, children?: ReactNode }) {
    const t = useParticleTraining({ w, h, onLeave, kana })
    const tut = useTutorial('particle', t.phase === 'intro', tutorial)
    const talk = useMergedTalk(t.talkRequest, tut.talkRequest)
    const npcs = questIslandNpcs(w, h, t.phase, targetFor(kana ?? 'mix'), t.failedLevel)
    const cast = t.phase === 'intro' ? [...npcs, tut.hiroko((npcs[0].ent.x ?? 0) + HIROKO_DX, npcs[0].ent.y ?? 0)] : npcs
    // as in questIsland.tsx: Hiroko's 'particle' tutorial in 'intro', one
    // merged talkRequest, the catch quest's cast. Ryuuko's {target} is the
    // particle (に / で) or にとで for the mix (particles.ts targetFor)
    return (
        <>
            <GameScene bgProps={questBg(w, h)} npcs={cast} onChoice={(n, c) => tut.onChoice(n, c) || t.onChoice(n, c)} onTalkEnd={n => tut.onTalkEnd(n) || t.onTalkEnd(n)} onTick={t.onTick} renderWorld={t.renderWorld} talkRequest={talk} moveRequest={t.moveRequest} wallY={t.wallY} playerLabel={t.playerLabel} sensitivity={sensitivity} />
            <Hud getHud={t.getHud} />
            {(t.phase === 'success' || t.phase === 'again') && children}
        </>
    )
}
// questIsland.tsx's Training on useParticleTraining; children = the success slot

export function ParticleQuestIsland({ onLeave, kana, sensitivity, tutorial, children }: { onLeave: () => void, kana?: string, sensitivity?: number, tutorial?: TutorialProps, children?: ReactNode }) {
    const boxRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState<{ w: number, h: number }>()
    useEffect(() => { stopBgm() }, [])
    useEffect(() => {
        const box = boxRef.current
        const w = box?.clientWidth || window.innerWidth
        const h = box?.clientHeight || window.innerHeight
        setSize({ w: Math.round(w * 2), h: Math.round(h * 1.5) })
    }, [])
    return (
        <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%', background: BUBBLE_BG }}>
            {size && <Training w={size.w} h={size.h} onLeave={onLeave} kana={kana} sensitivity={sensitivity} tutorial={tutorial}>{children}</Training>}
        </div>
    )
}
// questIsland.tsx's shell: stops any island BGM, measures the box once after
// mount (island 2x the screen wide, 1.5x tall). kana: 'に', 'で' or 'mix'
// (undefined = mix) picks the sentence pool
