'use client'

import { CSSProperties } from "react"

export default function TestMobileView({ size }: { size: CSSProperties }) {
    // `size` only carries a CSS custom property (e.g. --iphone-13-mini-width:
    // 360px), so it never resizes anything applied as-is -- pull that one
    // value out and use it as the actual frame width. The property name
    // itself (--iphone-... vs everything else) is also the only way to tell
    // which platform was selected, since PHONES only passes this object.
    const [varName, width] = Object.entries(size)[0] as [string, string]
    const isIphone = varName.startsWith('--iphone')

    return (
        <div
            style={{
                ...size,
                width,
                aspectRatio: '9 / 19.5',
                border: '2px solid black',
                borderRadius: isIphone ? '36px' : '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            TEST
        </div>
    )
}