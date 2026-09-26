'use client'

import { QuestsProps } from "@/utils/schema"
import EntityRenderer, { EntityProps } from "./entityRenderer"

type NPCProps = EntityProps & {
    selected: boolean
    dialog?: string,
    quest?: { id: number, title: string, status?: 'done' | 'resume' }
}

export default function NPCRenderer({npc={selected: false}, velocity}: {npc: NPCProps, velocity: {x: number, y: number}}) {



    return (
        <div><EntityRenderer velocity={velocity}/></div>
    )
}

// src/components/Game/Entity/npcRenderer.tsx

// npcs can be clicked or touched when their dialog bubble is on

// when selected zooms into npc

// by zooming in

// add [ok] button in

// by pressing [ok] zoom out to before zoom