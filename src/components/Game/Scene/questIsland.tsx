'use client'

import { CSSProperties, ReactNode, useEffect, useReducer, useRef, useState } from "react"
import GameScene, { questBg } from "./gameScene"
import { useTraining, TrainingHud } from "./training"
import { questIslandNpcs } from "../npcs/npcs"
import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W } from "../Entity/dialogBubble"
import { QUEST_BGM, playBgm, stopBgm } from "../Entity/voice" // imports: **QUEST_BGM, playBgm** -> **+ stopBgm**, mechanism: the island track is stopped on mount // imports: **none** -> **QUEST_BGM, playBgm**, mechanism: clear / fail music in Training

const TIMER_H = 8
const HP_H = TIMER_H * 3
const TIMER_TOP = 40
const HP_BOTTOM = 40
const HP_COLOR = '#ff8a8a'
const FLASH_MS = 300
const FLASH_OPACITY = 0.6
// the damage flash is the hp bar's color over the whole screen, starting at
// 60% opacity and fading to 0 over 300ms
// screen px: the timer is a thin strip 40px under the top; the hp bar is 3x
// as thick, 40px above the bottom

function Bar({ frac, color, style }: { frac: number, color: string, style: CSSProperties }) {
    return (
        <div style={{ position: 'absolute', zIndex: 2, boxSizing: 'border-box', border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, background: BUBBLE_BG, pointerEvents: 'none', ...style }}>
            <div style={{ width: `${frac * 100}%`, height: '100%', background: color }} />
        </div>
    )
}
// a bordered track with a fill anchored to its left edge, so as frac drops
// the right end moves left (drains right to left). border-box keeps the
// border inside the given size; the empty part shows the bubble color

function Hud({ getHud }: { getHud: () => TrainingHud }) {
    const [, force] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        let raf = requestAnimationFrame(function loop() { force(); raf = requestAnimationFrame(loop) })
        return () => cancelAnimationFrame(raf)
    }, [])
    const hud = getHud()
    const flash = FLASH_OPACITY * Math.max(0, 1 - (performance.now() - hud.hurtAt) / FLASH_MS)
    // linear fade from the last hit; drawn before the playing check so the
    // hit that ends a level (hp 0 -> fail) still flashes
    const overlay = flash > 0 && <div style={{ position: 'absolute', inset: 0, zIndex: 3, background: HP_COLOR, opacity: flash, pointerEvents: 'none' }} />
    // covers the whole box QuestIsland fills (it's position: relative), above the bars, and lets taps through
    if (!hud.playing) return overlay || null // not playing: **null** -> **overlay || null**, mechanism: a fading flash outlives the level's end
    return (
        <>
            {overlay}
            <Bar frac={hud.timeFrac} color="cyan" style={{ top: TIMER_TOP, left: '5%', width: '90%', height: TIMER_H }} /> {/* width: **left 0 / right 0 (full screen)** -> **left 5% / width 90%**, mechanism: same inset as the hp bar, so both bars line up */}
            <Bar frac={hud.hp / hud.maxHP} color={HP_COLOR} style={{ bottom: HP_BOTTOM, left: '5%', width: '90%', height: HP_H }} /> {/* color: **'#ff8a8a' literal** -> **HP_COLOR**, mechanism: one constant shared with the damage flash */} {/* color: **red** -> **#ff8a8a**, mechanism: a bright pastel red, pure red mixed toward white so it stays light and soft on the cream background */}
        </>
    ) // hud: **top-right box (target, current/quota, ♥ hp, seconds)** -> **timer + hp bars**, mechanism: timeFrac drives the cyan strip; hp / maxHP drives the red bar, which is 90% of the screen, so one hit is 90 / maxHP % of it. current/quota moved to the player's name tag (playerLabel), the target to the bubble over Ryuuko
}
// the training numbers live in refs that only GameScene's frame loop
// redraws, so the HUD runs its own rAF and re-reads getHud() each frame.
// It draws in screen px over the scene, and only while a level is played

function Training({ w, h, onLeave, kana, sensitivity, children }: { w: number, h: number, onLeave: () => void, kana?: string, sensitivity?: number, children?: ReactNode }) {
    const t = useTraining({ w, h, onLeave, kana }) // args: **no kana** -> **kana**, mechanism: the quest's kana picks the training's target
    const npcs = questIslandNpcs(w, h, t.phase)
    const bgm = t.phase === 'success' || t.phase === 'again' ? QUEST_BGM.clear : t.phase === 'fail' ? QUEST_BGM.fail : undefined
    useEffect(() => bgm ? playBgm(bgm) : undefined, [bgm])
    // result music: the clear track through 'success' and Ryuuko's replay
    // offer ('again'), the fail track through 'fail'. The effect depends on
    // the url, not the phase, so success -> again keeps the same track
    // playing; starting a level (or leaving) changes it to none and stops it
    return (
        <>
            <GameScene bgProps={questBg(w, h)} npcs={npcs} onChoice={t.onChoice} onTalkEnd={t.onTalkEnd} onTick={t.onTick} renderWorld={t.renderWorld} talkRequest={t.talkRequest} moveRequest={t.moveRequest} wallY={t.wallY} playerLabel={t.playerLabel} sensitivity={sensitivity} /> {/* props: **no playerLabel** -> **t.playerLabel**, mechanism: current/quota replaces the player's name tag while a level runs */} {/* props: **no moveRequest** -> **t.moveRequest**, mechanism: a level start places the player 350px below Ryuuko */} {/* props: **no onTalkEnd** -> **t.onTalkEnd**, mechanism: Ryuuko's success talk ending switches to 'again' */} {/* props: **no wallY** -> **t.wallY**, mechanism: a line below Ryuuko the player can't cross while a level runs */}
            <Hud getHud={t.getHud} />
            {(t.phase === 'success' || t.phase === 'again') && children} {/* slot: **success** -> **success / again**, mechanism: the COMPLETE button stays while Ryuuko offers a replay */}
        </>
    )
}
// npcs are built right in render from the phase, so the render that brings
// a new talkRequest key also brings the NPC it points at (Elena appears in
// the same render she's asked to talk). children = the success slot, shown
// only once both levels are cleared

export default function QuestIsland({ onLeave, kana, sensitivity, children }: { onLeave: () => void, kana?: string, sensitivity?: number, children?: ReactNode }) { // props: **no kana** -> **kana**, mechanism: passed through Training to useTraining; undefined falls back to あ
    const boxRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState<{ w: number, h: number }>()
    useEffect(() => { stopBgm() }, [])
    // the quest island starts silent: any island track still running (a
    // cleanup that lost a race, or one left over from a hot reload) is
    // stopped here, before the result music can start
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
// the island is twice the screen in each direction. The screen is the box
// this component fills (the phone frame in MobileTester, the page in
// QuestScene), falling back to the window; it's measured once after mount,
// since GameScene reads bgProps only when it mounts and nothing here may
// read the window during SSR. Until then the box is just the bubble color
