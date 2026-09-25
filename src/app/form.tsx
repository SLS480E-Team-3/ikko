'use client'

import { useRouter } from "next/navigation"
import styles from "./form.module.css"

export default function Form() {
    const router = useRouter()

    return (
        <div className={styles.page}>
            <div className={styles.temp} onClick={() => router.push('./MobileTester')}>MobileTester</div>
            <div className={styles.game} onClick={() => router.push('./Game')}>GAME</div>
            <div className={styles.game} onClick={() => router.push('./SignUp')}>SignUp</div>
        </div>
    )
}