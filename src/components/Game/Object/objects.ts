import type { ObjectDef } from "./gameObject"

export const OBJECTS: Record<string, ObjectDef> = {
    tower: {
        sprite: { src: '/img/temp.png', w: 384, h: 528, alt: 'tower' },
        hitBox: { x: 150, y: 470, w: 110, h: 50 },
    },
    tree: {
        sprite: { src: '/img/tree.webp', w: 256, h: 236, alt: 'tree' },
        hitBox: { x: 108, y: 188, w: 40, h: 48 },
    },
    // made by python/sprite.py (`make tree`): the file is a 64x59 pixel
    // sprite drawn 4x (256x236) with image-rendering: pixelated. The hitBox
    // is the trunk only (40 px wide, bottom 48 px), so the crown is walked
    // behind
}
// the object catalog: one ObjectDef per kind, keyed by the name a
// PlacedObject's def uses. tower is the temp art (public/img/temp.png,
// 384x528 drawn at its own size); its hitBox covers only the foot of the
// tower near the bottom of the image, so the player is stopped there and
// can walk behind everything above it
