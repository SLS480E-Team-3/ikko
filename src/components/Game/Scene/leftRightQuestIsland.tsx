'use client'

import { CSSProperties, ReactNode, useEffect, useReducer, useRef, useState } from "react"
import GameScene, { DOJO_WALL, hallBg } from "./gameScene" // import: **questBg** -> **hallBg**, mechanism: the quest is a long hallway now, not the dojo room
import { TrainingHud } from "./training"
import { FEET_H, HALL_W, hallH, spawnSpot, useLeftRightTraining } from "./leftRightTraining"
import { leftRightNpcs } from "../npcs/npcs"
import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W } from "../Entity/dialogBubble"
import { QUEST_BGM, playBgm, stopBgm } from "../Entity/voice"
// a copy of dodgeQuestIsland.tsx for the Left or Right quest: a long, narrow
// hallway island, the cast from leftRightNpcs, the doors as a wall and no
// timer strip.
// dodgeQuestIsland.tsx itself is untouched

const HP_H = 24
const HP_BOTTOM = 40
const HP_COLOR = '#ff8a8a'
const SIGN_TOP = 8 // top: **40** -> **8**, reason: the sign sat too low, over the doors, mechanism: screen px from the top edge
const SIGN_W = 160
// the word sign's distance from the screen top and its minimum width (screen px)
const FLASH_MS = 300
const FLASH_OPACITY = 0.6
// same hp bar size / color / damage flash as dodgeQuestIsland.tsx (copied,
// since that file doesn't export them). HP_H is dodge's TIMER_H * 3 written
// out, since there is no timer strip here

function Bar({ frac, color, style }: { frac: number, color: string, style: CSSProperties }) {
    return (
        <div style={{ position: 'absolute', zIndex: 2, boxSizing: 'border-box', border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, background: BUBBLE_BG, pointerEvents: 'none', ...style }}>
            <div style={{ width: `${frac * 100}%`, height: '100%', background: color }} />
        </div>
    )
}
// bordered track with a left-anchored fill, as in dodgeQuestIsland.tsx

type Sign = { verb: string, romaji: string, sub: string }

function Hud({ getHud, getFade, getSign }: { getHud: () => TrainingHud, getFade: () => number, getSign: () => Sign | undefined }) {
    const [, force] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        let raf = requestAnimationFrame(function loop() { force(); raf = requestAnimationFrame(loop) })
        return () => cancelAnimationFrame(raf)
    }, [])
    const hud = getHud()
    const flash = FLASH_OPACITY * Math.max(0, 1 - (performance.now() - hud.hurtAt) / FLASH_MS)
    const fade = getFade()
    const overlay = <>
        {flash > 0 && <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: HP_COLOR, opacity: flash, pointerEvents: 'none' }} />}
        {fade > 0 && <div style={{ position: 'absolute', inset: 0, zIndex: 4, background: 'black', opacity: fade, pointerEvents: 'none' }} />}
    </>
    // fade: **none** -> **black screen over everything (zIndex 4)**, reason: going through a door is a transition, mechanism: the hook's getFade() opacity read each frame by this rAF, so it also covers the HP bar and the damage flash
    if (!hud.playing) return overlay
    const sign = getSign()
    return (
        <>
            {overlay}
            {sign && (
                <div style={{ position: 'absolute', zIndex: 2, top: SIGN_TOP, left: '50%', transform: 'translateX(-50%)', minWidth: SIGN_W, padding: '6px 12px', boxSizing: 'border-box', border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, background: BUBBLE_BG, color: BUBBLE_BOARDER, display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.15, pointerEvents: 'none' }}>
                    <div style={{ fontSize: 32 }}>{sign.verb}</div>
                    <div style={{ fontSize: 14 }}>{sign.romaji}</div>
                    <div style={{ fontSize: 12, height: 14, whiteSpace: 'nowrap' }}>{sign.sub}</div>
                </div>
            )}
            {/* sign: **world px on the back wall (leftRightTraining renderWorld)** -> **fixed at the top of the screen**, reason: the doors fill the back wall now, mechanism: getSign() read each frame by this rAF, in the dialog bubble's colors and border, centered; screen px, so it doesn't scale with the zoom */}
            <Bar frac={hud.hp / hud.maxHP} color={HP_COLOR} style={{ bottom: HP_BOTTOM, left: '5%', width: '90%', height: HP_H }} />
        </>
    )
}
// dodgeQuestIsland.tsx's HUD without the cyan timer strip: its own rAF
// re-reads getHud() each frame for the damage flash and the hp bar

function Training({ w, h, onLeave, sensitivity, children }: { w: number, h: number, onLeave: () => void, sensitivity?: number, children?: ReactNode }) {
    const t = useLeftRightTraining({ w, h, onLeave })
    const bgm = t.phase === 'success' || t.phase === 'again' ? QUEST_BGM.clear : t.phase === 'fail' ? QUEST_BGM.fail : undefined
    useEffect(() => bgm ? playBgm(bgm) : undefined, [bgm])
    return (
        <>
            <GameScene bgProps={hallBg(w, h, spawnSpot(w, h).y)} npcs={leftRightNpcs(w, h, t.phase, t.failAt)} feetH={FEET_H} onChoice={t.onChoice} onTalkEnd={t.onTalkEnd} onTick={t.onTick} renderWorld={t.renderWorld} talkRequest={t.talkRequest} moveRequest={t.moveRequest} playerLabel={t.playerLabel} sensitivity={sensitivity} />
            <Hud getHud={t.getHud} getFade={t.getFade} getSign={t.getSign} />
            {(t.phase === 'success' || t.phase === 'again') && children}
        </>
    )
}
// dodgeQuestIsland.tsx's Training on useLeftRightTraining. bg: **questBg** ->
// **hallBg**, mechanism: the one-room hall; its solid back wall, with the
// doors in it, stops the player (no wallY). bgProps.y (the player's spawn / camera start) is
// spawnSpot's y. The cast comes from leftRightNpcs with failAt. BGM: clear on success / again, fail on
// fail; children fill the success slot

export function LeftRightQuestIsland({ onLeave, sensitivity, children }: { onLeave: () => void, sensitivity?: number, children?: ReactNode }) {
    const boxRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState<{ w: number, h: number }>()
    useEffect(() => { stopBgm() }, [])
    useEffect(() => {
        setSize({ w: HALL_W, h: hallH() }) // size: **h x h (square)** -> **HALL_W x hallH()**, mechanism: the hall is only as wide as the doors, and short: CORRIDOR px from the spawn to the doors
    }, [])
    return (
        <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%', background: DOJO_WALL }}> {/* background: **BUBBLE_BG (cream)** -> **DOJO_WALL**, reason: the screen above and below the small room showed cream, mechanism: the same brown as the room's side walls, so the room sits in its walls */}
            {size && <Training w={size.w} h={size.h} onLeave={onLeave} sensitivity={sensitivity}>{children}</Training>}
        </div>
    )
}
// same shell as DodgeQuestIsland (stops any island BGM, measures the box once
// after mount); the island is the hallway: HALL_W wide, hallH() tall
