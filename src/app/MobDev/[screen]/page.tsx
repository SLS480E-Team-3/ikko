// DEV
import { Suspense } from "react"
import { SCREEN_TYPES, ScreenType } from "../screenTypes"
import ScreenHost from "./screenHost"

export const dynamicParams = false
export const generateStaticParams = () => SCREEN_TYPES.map(screen => ({ screen }))

export default async function MobDevScreen({ params }: { params: Promise<{ screen: string }> }) {
    const { screen } = await params
    return (
        <Suspense>
            <ScreenHost screen={screen as ScreenType} />
        </Suspense>
    )
}
// /MobDev/<ScreenType>: generateStaticParams prerenders one static page per
// name at build time, and dynamicParams = false makes any other name a 404
// before any JS runs, so the cast is safe. Suspense is required because
// ScreenHost reads useSearchParams (?island, ?sens) and the page is static
