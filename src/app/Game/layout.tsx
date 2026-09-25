'use client'

import { BG_COLOR } from "@/components/Game/gameScene"

export default function GameLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <style>{`html, body { background-color: ${BG_COLOR}; }`}</style>
            {children}
        </>
    )
}
// wraps every /Game route. Safari tints its status bar strip (and anything
// the lvh box misses while the URL bar animates) with the page background,
// which was white -- this makes it the world's green. The <style> is part of
// this layout's render, so it's in the server HTML (no white flash) and is
// removed when you leave /Game, so other pages stay white. 'use client'
// because gameScene.tsx is a client module: a server component importing
// BG_COLOR from it would get a client reference, not the string. Once islands
// load their own bgProps.color, this should read that instead
