import GameScene from "@/components/Game/gameScene"

export default async function GameLevel({
    params,
}: {
    params: Promise<{ island: string }>
}) {
    const { island } = await params

    return (
        <div style={{ width: '100%', height: '100dvh' }} data-island={island}>
            <GameScene />
        </div>
    )
    // GameScene fills 100% of its parent, so this wrapper gives it the real
    // size: 100dvh tracks the visible mobile viewport (shrinks/grows with the
    // browser bars) where 100vh would sit under them. The page stays a server
    // component -- GameScene is 'use client', so it's rendered as a client
    // island inside it. `island` isn't used by the scene yet (data-island just
    // keeps it visible in devtools) -- later it picks the bg/quests to load
}
