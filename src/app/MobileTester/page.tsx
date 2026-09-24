'use client'

import TestMobileView from "@/components/testMobileView"
import {
    IPHONE17_SCREEN,
    IPHONE17_PRO_SCREEN,
    IPHONE17_MAX_SCREEN,
    IPHONE16_SCREEN,
    IPHONE16_PRO_SCREEN,
    IPHONE16_MAX_SCREEN,
    IPHONE15_SCREEN,
    IPHONE15_PRO_SCREEN,
    IPHONE15_MAX_SCREEN,
    IPHONE13_MINI_SCREEN,
    IPHONE13_SCREEN,
    IPHONE13_PRO_SCREEN,
    IPHONE13_MAX_SCREEN,
    IPHONE_SE_3RD_GEN_SCREEN,
    IPHONE_SE_2ND_GEN_SCREEN,
    GALAXY_S26_SCREEN,
    GALAXY_S26_ULTRA_SCREEN,
    PIXEL_10_SCREEN,
    PIXEL_10_PRO_SCREEN,
    XIAOMI_15_PRO_SCREEN,
} from "@/utils/mobileScreenSIze"
import { CSSProperties, useState } from "react"

const PHONES: { label: string; screen: CSSProperties }[] = [
    { label: 'IPHONE17', screen: IPHONE17_SCREEN },
    { label: 'IPHONE17_PRO', screen: IPHONE17_PRO_SCREEN },
    { label: 'IPHONE17_MAX', screen: IPHONE17_MAX_SCREEN },
    { label: 'IPHONE16', screen: IPHONE16_SCREEN },
    { label: 'IPHONE16_PRO', screen: IPHONE16_PRO_SCREEN },
    { label: 'IPHONE16_MAX', screen: IPHONE16_MAX_SCREEN },
    { label: 'IPHONE15', screen: IPHONE15_SCREEN },
    { label: 'IPHONE15_PRO', screen: IPHONE15_PRO_SCREEN },
    { label: 'IPHONE15_MAX', screen: IPHONE15_MAX_SCREEN },
    { label: 'IPHONE13_MINI', screen: IPHONE13_MINI_SCREEN },
    { label: 'IPHONE13', screen: IPHONE13_SCREEN },
    { label: 'IPHONE13_PRO', screen: IPHONE13_PRO_SCREEN },
    { label: 'IPHONE13_MAX', screen: IPHONE13_MAX_SCREEN },
    { label: 'IPHONE_SE_3RD_GEN', screen: IPHONE_SE_3RD_GEN_SCREEN },
    { label: 'IPHONE_SE_2ND_GEN', screen: IPHONE_SE_2ND_GEN_SCREEN },
    { label: 'GALAXY_S26', screen: GALAXY_S26_SCREEN },
    { label: 'GALAXY_S26_ULTRA', screen: GALAXY_S26_ULTRA_SCREEN },
    { label: 'PIXEL_10', screen: PIXEL_10_SCREEN },
    { label: 'PIXEL_10_PRO', screen: PIXEL_10_PRO_SCREEN },
    { label: 'XIAOMI_15_PRO', screen: XIAOMI_15_PRO_SCREEN },
]

export default function MobileTester() {

    const [phone, setPhone] = useState<CSSProperties>(PHONES[0].screen)

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex'
        }}>
            <div style={{
                justifyContent: 'left'
            }}>
                <select
                    name="phones"
                    id=""
                    onChange={(e) => {
                        const selected = PHONES.find((p) => p.label === e.target.value)
                        if (selected) setPhone(selected.screen)
                    }}
                >
                    {
                        PHONES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)
                    }
                </select>
            </div>
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <TestMobileView size={phone} />
            </div>
        </div>
    )
}