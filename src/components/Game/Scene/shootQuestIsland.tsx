'use client'

import { CSSProperties, ReactNode, useEffect, useReducer, useRef, useState } from "react"
import GameScene, { questBg } from "./gameScene"
import { TrainingHud } from "./training"
import { RYUUKO_W, RYUUKO_H, useShootTraining } from "./shootTraining" // imports: **useShootTraining** -> **+ RYUUKO_W, RYUUKO_H**, mechanism: her 1.5x size
import { questIslandNpcs } from "../npcs/npcs"
import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W } from "../Entity/dialogBubble"
import { QUEST_BGM, playBgm, stopBgm } from "../Entity/voice"
// a copy of questIsland.tsx that runs useShootTraining and hands its onShoot
// to GameScene; questIsland.tsx itself is untouched

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
    const t = useShootTraining({ w, h, onLeave, kana })
    const npcs = questIslandNpcs(w, h, t.phase).map((n, i) => {
        if (i !== 0) return n
        const x = n.ent.x
        return { ...n, ent: { ...n.ent, w: RYUUKO_W, h: RYUUKO_H, get x() { return t.getRyuukoX() ?? x } } }
    }) // Ryuuko: **fixed x** -> **getter reading getRyuukoX()**, mechanism: GameScene force()-renders every frame and reads ent.x each time (drawing, solids, camera), so the getter hands it her walking x without re-rendering Training; outside a level it falls back to npcs.ts's x // npcs: **shared cast** -> **Ryuuko (index 0) resized to 1.5x**, mechanism: a shallow copy of her ent with the new size, so npcs.ts and the original quest keep the default size
    const bgm = t.phase === 'success' || t.phase === 'again' ? QUEST_BGM.clear : t.phase === 'fail' ? QUEST_BGM.fail : undefined
    useEffect(() => bgm ? playBgm(bgm) : undefined, [bgm])
    return (
        <>
            <GameScene bgProps={questBg(w, h)} npcs={npcs} onChoice={t.onChoice} onTalkEnd={t.onTalkEnd} onTick={t.onTick} renderWorld={t.renderWorld} talkRequest={t.talkRequest} moveRequest={t.moveRequest} wallY={t.wallY} playerLabel={t.playerLabel} sensitivity={sensitivity} onShoot={t.onShoot} />
            <Hud getHud={t.getHud} />
            {(t.phase === 'success' || t.phase === 'again') && children}
        </>
    )
}
// questIsland.tsx's Training on useShootTraining, plus onShoot: GameScene
// calls it on Space, a quick tap, or a second finger while the stick is held;
// it fires only during a level and returns false otherwise, so Space still
// talks outside one

export function ShootQuestIsland({ onLeave, kana, sensitivity, children }: { onLeave: () => void, kana?: string, sensitivity?: number, children?: ReactNode }) {
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
            {size && <Training w={size.w} h={size.h} onLeave={onLeave} kana={kana} sensitivity={sensitivity}>{children}</Training>}
        </div>
    )
}
// same shell as QuestIsland: stops any island BGM, measures its box once
// after mount and makes the island 2x wide / 1.5x tall
