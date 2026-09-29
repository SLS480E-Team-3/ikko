'use client'

import { ReactNode, useEffect, useReducer, useRef, useState } from "react"
import GameScene, { questBg } from "./gameScene"
import { useTraining, TrainingHud } from "./training"
import { questIslandNpcs } from "../npcs/npcs"
import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W } from "../Entity/dialogBubble"

function Hud({ getHud }: { getHud: () => TrainingHud }) {
    const [, force] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        let raf = requestAnimationFrame(function loop() { force(); raf = requestAnimationFrame(loop) })
        return () => cancelAnimationFrame(raf)
    }, [])
    const hud = getHud()
    if (!hud.playing) return null
    return (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 2, padding: '4px 8px', background: BUBBLE_BG, border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`, fontSize: '0.875rem', display: 'flex', gap: 10, pointerEvents: 'none' }}>
            <span>{hud.target} ({hud.romaji})</span>
            <span>{hud.current}/{hud.quota}</span>
            <span>♥ {hud.hp}</span>
            <span>{hud.secondsLeft}s</span>
        </div>
    )
}
// the training numbers live in refs that only GameScene's frame loop
// redraws, so the HUD runs its own rAF and re-reads getHud() each frame.
// It draws in screen px (top-right, over the scene) and only while a level
// is being played, in the DialogBubble box style

function Training({ w, h, onLeave, sensitivity, children }: { w: number, h: number, onLeave: () => void, sensitivity?: number, children?: ReactNode }) {
    const t = useTraining({ w, h, onLeave })
    const npcs = questIslandNpcs(w, h, t.phase)
    return (
        <>
            <GameScene bgProps={questBg(w, h)} npcs={npcs} onChoice={t.onChoice} onTick={t.onTick} renderWorld={t.renderWorld} talkRequest={t.talkRequest} moveRequest={t.moveRequest} sensitivity={sensitivity} /> {/* props: **no moveRequest** -> **t.moveRequest**, mechanism: a level start places the player 350px below Ryuuko */}
            <Hud getHud={t.getHud} />
            {(t.phase === 'success' || t.phase === 'again') && children} {/* slot: **success** -> **success / again**, mechanism: the COMPLETE button stays while Ryuuko offers a replay */}
        </>
    )
}
// npcs are built right in render from the phase, so the render that brings
// a new talkRequest key also brings the NPC it points at (Elena appears in
// the same render she's asked to talk). children = the success slot, shown
// only once both levels are cleared

export default function QuestIsland({ onLeave, sensitivity, children }: { onLeave: () => void, sensitivity?: number, children?: ReactNode }) {
    const boxRef = useRef<HTMLDivElement>(null)
    const [size, setSize] = useState<{ w: number, h: number }>()
    useEffect(() => {
        const box = boxRef.current
        const w = box?.clientWidth || window.innerWidth
        const h = box?.clientHeight || window.innerHeight
        setSize({ w: Math.round(w * 2), h: Math.round(h * 2) })
    }, [])
    return (
        <div ref={boxRef} style={{ position: 'relative', width: '100%', height: '100%', background: BUBBLE_BG }}>
            {size && <Training w={size.w} h={size.h} onLeave={onLeave} sensitivity={sensitivity}>{children}</Training>}
        </div>
    )
}
// the island is twice the screen in each direction. The screen is the box
// this component fills (the phone frame in MobileTester, the page in
// QuestScene), falling back to the window; it's measured once after mount,
// since GameScene reads bgProps only when it mounts and nothing here may
// read the window during SSR. Until then the box is just the bubble color
