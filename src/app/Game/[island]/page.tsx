import GameScene from "@/components/Game/gameScene"

export default async function GameLevel({
    params,
}: {
    params: Promise<{ island: string }>
}) {
    const { island } = await params

    return (
        <div style={{ width: '100%', height: '100lvh' }} data-island={island}> {/* height: **100dvh** -> **100lvh**, reason: white strip under iPhone Safari's floating URL bar, mechanism: lvh is the full-screen height, so the world renders under the glass bar instead of stopping above it */}
            <GameScene />
        </div>
    )
    // GameScene fills 100% of its parent, so this wrapper gives it the real
    // size: 100lvh is the full screen height, reaching under the mobile
    // browser's bottom bar (see the fix comment above). The page stays a server
    // component -- GameScene is 'use client', so it's rendered as a client
    // island inside it. `island` isn't used by the scene yet (data-island just
    // keeps it visible in devtools) -- later it picks the bg/quests to load
}
