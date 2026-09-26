import type { ObjectDef } from "./gameObject"

export const OBJECTS: Record<string, ObjectDef> = {
    tower: {
        sprite: { src: '/img/temp.png', w: 384, h: 528, alt: 'tower' },
        hitBox: { x: 150, y: 470, w: 110, h: 50 },
    },
}
// the object catalog: one ObjectDef per kind, keyed by the name a
// PlacedObject's def uses. tower is the temp art (public/img/temp.png,
// 384x528 drawn at its own size); its hitBox covers only the foot of the
// tower near the bottom of the image, so the player is stopped there and
// can walk behind everything above it
