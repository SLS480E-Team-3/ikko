'use client'

import { BGProps } from "./gameScene"
import ObjectRenderer from "../Object/ObjectRenderer"
import { PlacedObject, applyScale } from "../Object/gameObject"
import { OBJECTS } from "../Object/objects"

type SceneProps = BGProps & {
    gameObjects: PlacedObject[] // type: **GameObjectProps[]** -> **PlacedObject[]**, mechanism: GameObjectProps was split into the catalog ObjectDef + a saved PlacedObject
}


export default function Scene({objpool}: {objpool: PlacedObject[]}) { // type: **GameObjectProps[]** -> **PlacedObject[]**, mechanism: same split as above
    return (
        <div>
            {objpool.map((obj) => OBJECTS[obj.def] && <ObjectRenderer key={obj.id} obj={obj} def={applyScale(OBJECTS[obj.def], obj.scale)}/>)} {/* def: **OBJECTS[obj.def]** -> **applyScale(OBJECTS[obj.def], obj.scale)**, mechanism: draws the placement at its own scale without touching the catalog */} {/* def: **{}** -> **OBJECTS[obj.def]**, mechanism: looks the placement's kind up in the catalog; an unknown kind renders nothing. key: **none** -> **obj.id** */}
        </div>
    )
}
