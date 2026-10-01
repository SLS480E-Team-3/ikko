'use client'

import { useSyncExternalStore } from "react"
import { isMuted, onMuteChange, setMuted } from "../Entity/voice"

export default function MuteButton() {
    const muted = useSyncExternalStore(onMuteChange, isMuted, () => true) // server snapshot: **false** -> **true**, mechanism: matches the new default (muted), so a first visit shows 🔇 from the first paint
    // the mute flag lives in voice.ts, outside React: onMuteChange subscribes,
    // isMuted is the snapshot, so every MuteButton on screen follows the same
    // flag. The server snapshot is true (no localStorage there); React
    // re-renders with the stored value right after hydration

    return (
        <button
            type="button"
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            aria-pressed={muted}
            onClick={() => setMuted(!muted)}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
            style={{
                position: 'absolute',
                top: 'calc(env(safe-area-inset-top, 0px) + 60px)', // top: **12px** -> **60px**, mechanism: the quest timer bar is at 40-48px from the top and 90% wide, so at 12px the button covered its right end; 60px puts it below the bar
                right: 12,
                zIndex: 3,
                width: 44,
                height: 44,
                padding: 0,
                borderRadius: '50%',
                border: '2px solid rgba(0, 0, 0, 0.6)',
                background: 'rgba(255, 255, 255, 0.8)',
                fontSize: 22,
                lineHeight: 1,
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: 'pointer',
            }}
        >
            {muted ? '🔇' : '🔊'}
        </button>
    )
    // a 44px round button (the minimum comfortable touch target) in the
    // scene's top-right corner, below the notch. zIndex 3 puts it above the
    // stick overlay (1) and the islands' link rows (2). stopPropagation on
    // pointer down / up keeps the tap from reaching GameScene's pinch
    // handlers, so pressing it never counts as a second finger (pinch / shoot)
}
// usage: <MuteButton /> inside a position: relative box; GameScene renders
// one, so it shows on every island and quest island
