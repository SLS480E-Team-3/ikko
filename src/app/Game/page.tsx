'use client'
import MobileGameScene from "@/components/Game/MobileGameScene";

export default function Game() {
    return (
        <div style={{ width: '100%', height: '100dvh' }}>
            <MobileGameScene/>
        </div>
    ) // render: **bare <MobileGameScene/>** -> **inside a 100dvh wrapper**, reason: the page was a white screen, mechanism: MobileGameScene is height 100% of its parent, and body has no height (it just wraps its content), so the scene measured 0px tall; the wrapper gives it the visible viewport's height (100dvh tracks the mobile browser bars), same as Game/[island]/page.tsx
}
