'use client'

import { ObjectDef, PlacedObject } from "./gameObject"
import Image from "next/image"

export default function ObjectRenderer({ obj, def }: { obj: PlacedObject, def: ObjectDef }) { // props: **{ obj: GameObjectProps }** -> **{ obj: PlacedObject, def: ObjectDef }**, mechanism: the placement saves only where + which kind; the sprite comes from the catalog def GameScene resolved
    return (
        <div
            style={{
                position: 'absolute',
                left: obj.x,
                top: obj.y,
                height: def.sprite.h,
                width: def.sprite.w,
                zIndex: Math.round(obj.y + def.sprite.h), // layer: **DOM order** -> **bottom edge**, mechanism: GameScene gives the player the same bottom-edge zIndex, so the lower one on screen draws in front and the player can walk behind the tower
                pointerEvents: 'none',
            }}
        >
            <Image
                src={def.sprite.src}
                alt={def.sprite.alt}
                fill // size: **none** -> **fill**, mechanism: next/image throws on a string src without width/height; fill stretches it over this sized div, so the world-px w/h above decides the drawn size
                unoptimized // serve the original file: the optimizer resizes to the on-screen width with smoothing, which blurs pixel art, and the scene zoom (up to 4x) would ask for a bigger copy than the png anyway
                style={{ imageRendering: 'pixelated' }} // style: **smooth scaling** -> **pixelated**, mechanism: keeps pixel-art edges sharp when the scene zoom scales it up
                draggable={false}
            />
        </div>
    )
}
