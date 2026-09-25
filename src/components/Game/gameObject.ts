export type gameObjectProps = {
    x: number,
    y: number,
    w: number,
    h: number,

    allowCollision: boolean,
    hitBox: {
        x: number,
        y: number
    }
}