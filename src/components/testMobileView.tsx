'use client'

import { CSSProperties } from "react"

export default function TestMobileView({ size }: { size: CSSProperties }) {
    return (
        <div style={size}>
            TEST
        </div>
    )
}