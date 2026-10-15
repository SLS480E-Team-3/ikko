// DEV
import Link from "next/link"
import { SCREEN_TYPES } from "./screenTypes"

export default function MobDevList() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, boxSizing: 'border-box', width: '100%' }}>
            {SCREEN_TYPES.map(t => (
                <Link key={t} href={`/MobDev/${t}`} prefetch={false}
                    style={{ display: 'block', padding: '14px 16px', fontSize: 20, color: 'inherit', border: '2px solid currentColor', textDecoration: 'none' }}>
                    {t}
                </Link>
            ))}
        </div>
    )
}
// /MobDev: a static server-rendered list, one tap-sized link per screen type.
// prefetch={false} because production Next prefetches links in view, which
// would pull all 10 screen chunks onto the phone just by opening the list.
// Settings (?island=, ?sens=) are added to the URL by hand
