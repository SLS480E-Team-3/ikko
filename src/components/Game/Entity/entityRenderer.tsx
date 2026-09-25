'use client'

export type Facing =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'up-left'
    | 'up-right'
    | 'down-left'
    | 'down-right'
    | 'none'

export type EntityProps = {
    // pos: { x: number, y: number },
    // body: { h: number, w: number },
    x?: number,
    y?: number,
    w: number,
    h: number,
    deg?: number 

    color?: string,

    facing: Partial<Facing>
}

const TILT_MAX = 16
// one constant per direction, named after it, so the ternary below reads
// as a lookup and any single angle can change without touching the others

export const ENT_W = 12
export const ENT_H = 20
// exported so wrappers (player name tag) can fall back to the same default
// size EntityRenderer uses when no ent is passed

function applyRotation(velocity: { x: number, y: number }): string {
    const up = velocity.y < 0
    const down = velocity.y > 0
    const right = velocity.x > 0
    const left = velocity.x < 0
    const DEG = 10
    // need to skew + DEG
    const template = (deg: number) => `rotate(${deg}deg)`
    if (up) {
        if (right) {
            return template(-DEG)
        }
        if (left) {
            return template(DEG)
        }
    }
    if (down) {
        if (right) {
            return template(DEG)
        }
        if (left) {
            return template(-DEG)
        }
    }
    return ''
}

export default function EntityRenderer({
    velocity,
    ent = {
        w: ENT_W,
        h: ENT_H,
        color: 'gray', // temp default
        facing: 'none'
    }
}: { velocity: { x: number, y: number }, ent?: EntityProps }) {

    const skew = velocity.x > 0 ? `skewX(${-TILT_MAX}deg)` // moving right
        : velocity.x < 0 ? `skewX(${TILT_MAX}deg)` // moving left
            : ''

    const rot = applyRotation(velocity)

    return (
        <div
            style={{
                position: 'absolute',
                left: ent.x,
                top: ent.y,
                width: ent.w,
                height: ent.h,
                transform: `translate(-50%, -50%) ${skew} ${rot}`,
                transition: 'background-color 0.2s, transform 0.15s ease-out',
                backgroundColor: ent.color
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: ent.h - 16,
                    height: 4,
                    width: 4,
                    left: 0,
                    backgroundColor: 'black'
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    top: ent.h - 16,
                    height: 4,
                    width: 4,
                    right: 0,
                    backgroundColor: 'black'
                }}
            />
            {/* absolute children ignore justifyContent (that's a flex-container
                prop), so left/right pin each eye to its own side of the body */}
        </div>

    )
}