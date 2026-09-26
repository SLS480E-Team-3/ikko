'use client'

import { GameObjectProps } from "./gameObject"

export default function ObjectRenderer({ obj }: { obj: GameObjectProps }) {
    return (
        <div
        style={{
            position: 'absolute',
            left: obj.x,
            top: obj.y,
            height: obj.h,
            width: obj.w,
            backgroundImage: `url(/public/objectSprite/${obj.img})`
        }}
        >

        </div>
    )
}