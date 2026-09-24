'use client'

import TestMobileView from "@/components/testMobileView"
import { IPHONE13_MAX_SCREEN } from "@/utils/mobileScreenSIze"
import { CSSProperties, useState } from "react"

export default function MobileTester() {

    const [phone, setPhone] = useState<CSSProperties>()

    return(
        <div style={{
            height: '100vh',
            width: '100vw'
        }}>
            <TestMobileView />
        </div>
    )
}