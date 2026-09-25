// Dev
'use client'

import { CSSProperties, ReactNode } from "react"

export default function MobileView({ size, page }: { size: CSSProperties, page?: ReactNode }) {
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