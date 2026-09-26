// Assets Path /public/objectSprite/

export type GameObjectProps = {
    x: number,
    y: number,
    w: number,
    h: number,

    allowCollision: boolean,
    hitBox: {
        x: number,
        y: number
    },

    img: string // webP 
}