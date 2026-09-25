// DEV
'use client'

import { CSSProperties, ReactNode } from "react"

export default function TestMobileView({ size, page }: { size: CSSProperties, page?: ReactNode }) {
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
                border: '2px solid black',
                borderRadius: isIphone ? '36px' : '0',
                flexShrink: 0,
                margin: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                isolation: 'isolate',
                overflow: 'hidden'
            }}
        >
            {page}
        </div>
    )
}