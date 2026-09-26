'use client'
import GameScene from "@/components/Game/Scene/gameScene"; // import: **MobileGameScene** -> **GameScene**, mechanism: MobileGameScene was merged into GameScene, which now has the joystick and pinch built in

export default function Game() {
    return (
        <div style={{ width: '100%', height: '100lvh' }}> {/* height: **100dvh** -> **100lvh**, reason: iPhone Safari showed a white strip under the floating URL bar, mechanism: dvh stops at the bar's top edge, lvh is the full-screen height, so the world renders under the glass bar and shows through it; touchAction none on the scene keeps the extra height from scrolling */}
            <GameScene/>
        </div>
    ) // render: **bare <MobileGameScene/>** -> **inside a 100dvh wrapper**, reason: the page was a white screen, mechanism: GameScene is height 100% of its parent, and body has no height (it just wraps its content), so the scene measured 0px tall; the wrapper gives it the visible viewport's height (100dvh tracks the mobile browser bars), same as Game/[island]/page.tsx
}
