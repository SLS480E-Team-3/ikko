'use client'

import { UserProps } from "@/utils/schema"
import EntityRenderer, { ENT_H, EntityProps } from "./entityRenderer"

export type PlayerProps = {
    hatPoint?: {x: number, y: number}
    ent?: EntityProps
    name?: UserProps['name']
    island?: UserProps['island'],
    color?: UserProps['color']
}

const NAME_GAP = 4 // px between the top of the body and the name
const NAME_SIZE = 8 // world px, scaled by the scene zoom like everything else

export default function PlayerRenderer({ velocity, maxSpeed, player }: { velocity: { x: number, y: number }, maxSpeed?: number, player: PlayerProps }) { // props: **no maxSpeed** -> **maxSpeed?**, reason: EntityRenderer's lean scales by it, mechanism: passed straight through below; optional so EntityRenderer's default applies when unset
    const h = player.ent?.h ?? ENT_H

    return (
        <div
            style={{
                position: 'inherit'
            }}
        >
            {player.name && (
                <div
                    style={{
                        position: 'absolute',
                        left: player.ent?.x,
                        top: player.ent?.y,
                        transform: `translate(-50%, calc(-100% - ${h / 2 + NAME_GAP}px))`,
                        fontSize: NAME_SIZE,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}
                >
                    {player.name}
                </div>
            )}
            {/* the name is a sibling of the body, not a child, so it doesn't
                pick up the body's skew/rotate and stays upright. It anchors on
                the same center point (x, y): -50% x centers it, then y moves up
                by its own height (-100%) plus half the body and a gap, so its
                bottom edge sits NAME_GAP above the body's top. nowrap keeps the
                name on one line (absolute + zero-width parent would wrap it) */}
            <EntityRenderer velocity={velocity} maxSpeed={maxSpeed} ent={player.ent} /> {/* props: **velocity, ent** -> **+ maxSpeed**, reason: lean follows the stick, mechanism: pass-through from GameScene's PLAYER_SPEED */}
        </div>
    )
}