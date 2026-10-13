'use client'

import { useRouter } from "next/navigation"
import styles from "./form.module.css"

export default function Form() {
    const router = useRouter()

    return (
        <div className={styles.page}>
            <div className={styles.temp} onClick={() => router.push('./MobileTester')}>MobileTester</div>
            <div className={styles.game} onClick={() => router.push('./Game')}>GAME</div>
            <div className={styles.temp} onClick={() => router.push('./SignUp')}>SignUp</div>
            <div className={styles.temp} onClick={() => router.push('./Dev/QuestOriginal')}>original</div>
            <div className={styles.temp} onClick={() => router.push('./Dev/QuestDodge')}>dodge</div>
            <div className={styles.temp} onClick={() => router.push('./Dev/QuestShoot')}>shoot</div>
            <div className={styles.temp} onClick={() => router.push('./Dev/QuestDoor')}>door</div> {/* buttons: **original / dodge / shoot** -> **+ door**, mechanism: pushes Dev/QuestDoor, the Left or Right quest full-screen */}
            {/* dev buttons, one per quest type: each pushes its own
                route under src/app/Dev/, whose page renders that quest island
                full-screen (QuestIsland / DodgeQuestIsland / ShootQuestIsland / LeftRightQuestIsland) */}
        </div>
    )
}