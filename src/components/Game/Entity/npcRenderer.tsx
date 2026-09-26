'use client'

import { QuestsProps } from "@/utils/schema"
import EntityRenderer, { EntityProps } from "./entityRenderer"

type NPCProps = EntityProps & {
    selected: boolean
    dialog?: string,
    quest?: QuestsProps
}

export default function NPCRenderer({npc={selected: false}, velocity}: {npc: NPCProps, velocity: {x: number, y: number}}) {



    return (
        <div><EntityRenderer velocity={velocity}/></div>
    )
}