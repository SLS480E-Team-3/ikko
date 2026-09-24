'use client'

import { CSSProperties } from "react"

export default function TestMobileView({ size }: { size: CSSProperties }) {
    // `size` only carries custom properties (--<device>-width/-height), which
    // resize nothing on their own -- pick them out by suffix and apply them as
    // the real width/height. The --iphone prefix is the only platform signal.
    const entries = Object.entries(size) as [string, string][]
    const width = entries.find(([k]) => k.endsWith('-width'))?.[1]
    const height = entries.find(([k]) => k.endsWith('-height'))?.[1]
    const isIphone = entries[0][0].startsWith('--iphone')

    return (
        <div
            style={{
                ...size,
                width,
                height,
                // border sits outside width/height (content-box), so the inner
                // screen area is exactly the device viewport
                border: '2px solid black',
                borderRadius: isIphone ? '36px' : '0',
                flexShrink: 0,
                // auto margins center it, but fall back to start-aligned when
                // the frame is taller than the window, so it scrolls instead
                // of being clipped off the top
                margin: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            TEST
        </div>
    )
}