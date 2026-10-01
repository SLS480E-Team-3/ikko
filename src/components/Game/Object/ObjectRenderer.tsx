'use client'

import { ObjectDef, PlacedObject } from "./gameObject"
import Image from "next/image"

const FADED_OPACITY = 0.4
// how see-through a sprite gets while the player is behind it: the player
// shows through, and the object is still readable

export default function ObjectRenderer({ obj, def, faded = false }: { obj: PlacedObject, def: ObjectDef, faded?: boolean }) { // props: **{ obj, def }** -> **+ faded?**, mechanism: GameScene sets it while the player stands behind this object, so the sprite turns see-through // props: **{ obj: GameObjectProps }** -> **{ obj: PlacedObject, def: ObjectDef }**, mechanism: the placement saves only where + which kind; the sprite comes from the catalog def GameScene resolved
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
                opacity: faded ? FADED_OPACITY : 1,
                transition: 'opacity 0.25s ease-in-out',
                // the css transition eases between the two opacities over
                // 0.25s in both directions, so GameScene only flips a boolean
            }}
        >
            <Image
                src={def.sprite.src}
                alt={def.sprite.alt}
                fill // size: **none** -> **fill**, mechanism: next/image throws on a string src without width/height; fill stretches it over this sized div, so the world-px w/h above decides the drawn size
                unoptimized // serve the original file: the optimizer resizes to the on-screen width with smoothing, which blurs pixel art, and the scene zoom (up to 4x) would ask for a bigger copy than the png anyway
                style={{ imageRendering: 'pixelated' }} // style: **smooth scaling** -> **pixelated**, mechanism: keeps pixel-art edges sharp when the scene zoom scales it up
                draggable={false}
                loading="eager" // loading: **lazy (next/image default)** -> **eager**, mechanism: the sprite is fetched on mount instead of when it scrolls into view, so a big on-screen object (the tower is the page's LCP) isn't delayed and an object doesn't pop in late as the camera pans to it; the catalog is a handful of shared pngs, so eager costs little
            />
        </div>
    )
}
