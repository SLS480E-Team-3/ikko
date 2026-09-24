'use client'

import { UserProps } from "@/utils/user"

type PlayerProps = UserProps & {
    
}

type BGProps = {
    x: number,
    y: number,
    h: number,
    w: number
}

type SceneProps = {
    backGround: BGProps,
    
}

export default function GameScene({}) {
    return (
        <div></div>
    )
}