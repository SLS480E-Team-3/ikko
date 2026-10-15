'use client'

import { useRouter } from "next/navigation"
import styles from "./form.module.css"

export default function Form() {
    const router = useRouter()

    return (
        <div className={styles.page}>
            <div className={styles.temp} onClick={() => router.push('./MobileTester')}>MobileTester</div>
            <div className={styles.temp} onClick={() => router.push('/MobDev')}>MobDev</div>
            {/* opens the /MobDev screen list: each screen full-screen on a phone, one chunk per screen */}
            <div className={styles.game} onClick={() => router.push('./Game')}>GAME</div>
            <div className={styles.temp} onClick={() => router.push('./SignUp')}>SignUp</div>
            <div className={styles.temp} onClick={() => router.push('/MobDev/QuestOriginal')}>original</div> {/* push: **'./Dev/QuestOriginal'** -> **'/MobDev/QuestOriginal'**, mechanism: the /Dev/Quest* folders were replaced by the MobDev/[screen] route */}
            <div className={styles.temp} onClick={() => router.push('/MobDev/QuestDodge')}>dodge</div> {/* push: **'./Dev/QuestDodge'** -> **'/MobDev/QuestDodge'**, mechanism: the /Dev/Quest* folders were replaced by the MobDev/[screen] route */}
            <div className={styles.temp} onClick={() => router.push('/MobDev/QuestShoot')}>shoot</div> {/* push: **'./Dev/QuestShoot'** -> **'/MobDev/QuestShoot'**, mechanism: the /Dev/Quest* folders were replaced by the MobDev/[screen] route */}
            <div className={styles.temp} onClick={() => router.push('/MobDev/QuestDoor')}>door</div> {/* push: **'./Dev/QuestDoor'** -> **'/MobDev/QuestDoor'**, mechanism: same as above */} {/* buttons: **original / dodge / shoot** -> **+ door**, mechanism: pushes Dev/QuestDoor, the Left or Right quest full-screen */}
            {/* dev buttons, one per quest type: each pushes its own
                /MobDev/<ScreenType> route, which renders that quest island
                full-screen (QuestIsland / DodgeQuestIsland / ShootQuestIsland / LeftRightQuestIsland) */}
        </div>
    )
}