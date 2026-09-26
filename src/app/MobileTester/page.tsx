// DEV
'use client'

import MobileView from "@/components/MobileView"
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
import { CSSProperties, ReactNode, useState } from "react"
import GameScene from "@/components/Game/Scene/gameScene"
import SignUpPage from "@/app/SignUp/page"
import LogInPage from "@/app/LogIn/page"
import InfoRecovery from "@/app/InfoRecovery/page"
import EditInfo from "@/app/EditInfo/page"
import { ISLAND_MAPS } from "@/components/Game/islands"
import MobileGameScene, { SENSITIVITY_DEF } from "@/components/Game/MobileGameScene" // imports: **default only** -> **+ SENSITIVITY_DEF**, reason: seed the sensitivity input, mechanism: the input starts at the same default the scene uses

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

const PAGES: { label: string; page: (sensitivity: number) => ReactNode }[] = [ // type: **page: ReactNode** -> **page: (sensitivity) => ReactNode**, reason: the sensitivity input must reach MobileGameScene, mechanism: a prebuilt element is frozen with its props, so each page is built at render time from the current input
    { label: 'mobile game scene', page: (s) => <MobileGameScene sensitivity={s} objects={ISLAND_MAPS[1]} /> }, // props: **sensitivity** -> **+ objects**, mechanism: shows island 1's map (the tower) without logging in to /Game/1
    { label: 'sign up', page: () => <SignUpPage /> },
    { label: 'log in', page: () => <LogInPage /> },
    { label: 'recovery', page: () => <InfoRecovery /> },
    { label: 'edit info', page: () => <EditInfo /> },
    { label: 'game scene', page: () => <GameScene objects={ISLAND_MAPS[1]} /> }, // props: **none** -> **objects**, mechanism: same as above
]
// mobile game scene = GameScene + the touch joystick; drag with the mouse
// anywhere on the phone to test it on a laptop

export default function MobileTester() {

    const [phone, setPhone] = useState<CSSProperties>(PHONES[0].screen)
    const [page, setPage] = useState<(sensitivity: number) => ReactNode>(() => PAGES[0].page) // state: **the element** -> **its builder**, reason: see PAGES, mechanism: the useState initializer and setPage(() => fn) wrap it because React would call a bare function as an updater
    const [sensitivity, setSensitivity] = useState<number>(SENSITIVITY_DEF)

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex'
        }}>
            <div style={{
                justifyContent: 'left',
            }}>
                <select
                    style={{
                        height: 50,
                        fontSize: 32
                    }}
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
                justifyContent: 'left',
            }}>
                <select
                    style={{
                        height: 50,
                        fontSize: 32
                    }}
                    onChange={(e) => {
                        const selected = PAGES.find((p) => p.label === e.target.value)
                        if (selected) setPage(() => selected.page)
                    }}
                >
                    {
                        PAGES.map((p) => <option key={p.label} value={p.label}>{p.label}</option>)
                    }
                </select>
            </div>
            <label style={{ fontSize: 24, height: 50, display: 'flex', alignItems: 'center', gap: 8, color: 'white' }}>
                sensitivity
                <input
                    type="number"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={sensitivity}
                    onChange={(e) => setSensitivity(Number(e.target.value))}
                    style={{ width: 80, height: 40, fontSize: 24 }}
                />
            </label>
            {/* joystick sensitivity for 'mobile game scene': full push =
            50px / sensitivity of drag. A number input with 0.1 steps; an
            empty box becomes 0, which MobileGameScene floors at 0.1 */}
            <div style={{
                flex: 1,
                display: 'flex',
                overflow: 'auto'
            }}>
                <MobileView size={phone} page={page(sensitivity)} />
            </div>
        </div>
    )
}