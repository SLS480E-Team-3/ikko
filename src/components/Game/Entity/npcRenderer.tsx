'use client'

import { QuestsProps } from "@/utils/schema"
import EntityRenderer, { EntityProps } from "./entityRenderer"

type NPCProps = EntityProps & {
    interatable: boolean
    dialog?: string,
    quest?: QuestsProps
}

export default function NPCRenderer({velocity}: {velocity: {x: number, y: number}}) {
    return (
        <div><EntityRenderer velocity={velocity}/></div>
    )
}