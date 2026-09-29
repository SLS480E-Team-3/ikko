'use client'

import { UserProps } from "@/utils/schema"
import EntityRenderer, { EntityProps } from "./entityRenderer"

export type PlayerProps = {
    hatPoint?: { x: number, y: number }
    ent?: EntityProps
    name?: UserProps['name']
    island?: UserProps['island'],
    color?: UserProps['color'],

    talking?: boolean // talking is by defalut false
}

export default function PlayerRenderer({ velocity, maxSpeed, player }: { velocity: { x: number, y: number }, maxSpeed?: number, player: PlayerProps }) { // props: **no maxSpeed** -> **maxSpeed?**, reason: EntityRenderer's lean scales by it, mechanism: passed straight through below; optional so EntityRenderer's default applies when unset
    return (
        <div
            style={{
                position: 'inherit'
            }}
        >
            <EntityRenderer 
            style={{ transition: 'opacity 0.55s ease-in-out', opacity: player.talking ? 0 : 1 }} // style: **!talking ? { transform: 'ease-in, ease-out', opacity: 0 } : ''** -> **transition opacity 0.25s, talking ? 0 : 1**, mechanism: the transition is always set, so the browser eases 1 -> 0 when a talk starts and 0 -> 1 when it ends
            velocity={velocity} maxSpeed={maxSpeed} ent={player.ent && { ...player.ent, name: player.name ?? player.ent.name }} /> {/* ent: **player.ent + a name tag div here** -> **player.name copied into ent.name**, mechanism: EntityRenderer draws the tag from ent.name now; player.name (from the db user) wins, ent.name is the fallback. A fresh object each render is fine: GameScene mutates player.ent in place and the copy reads its current x/y */} {/* props: **velocity, ent** -> **+ maxSpeed**, reason: lean follows the stick, mechanism: pass-through from GameScene's PLAYER_SPEED */}
        </div>
    )
}