// DEV
import Form from "../form"

export default function DevPage() {
    return <Form/>
}
// render: **?Island=N shows the island preview full-screen, else the dev nav** -> **always the dev nav**, mechanism: the full-screen island preview moved to /MobDev/GameScene?island=N (docs/mobile-testing.md). The dev nav is the old landing page's MobileTester / GAME / SignUp / quest buttons, moved here when '/' became the redirect to the player's island. Not in the proxy matcher, so it opens logged in or out
