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
    'Tokyo-tower': {
        sprite: { src: '/img/Tokyo-tower.webp', w: 256, h: 596, alt: 'Tokyo-tower' },
        hitBox: { x: 0, y: 476, w: 256, h: 120 },
    },
    // made by python/sprite.py (`make Tokyo-tower`): a 64x149 pixel sprite
    // drawn 4x (256x596). The key is quoted because of the hyphen. The
    // script printed hitBox x: 100, w: 56, which is only the front leg (the
    // one leg that reaches the bottom 8% of rows); the side legs end higher
    // up, so x / w are set by hand to the full width and the player is
    // stopped by all the legs. Height stays the bottom 120 px, so the deck
    // and spire are walked behind
}
// the object catalog: one ObjectDef per kind, keyed by the name a
// PlacedObject's def uses. tower is the temp art (public/img/temp.png,
// 384x528 drawn at its own size); its hitBox covers only the foot of the
// tower near the bottom of the image, so the player is stopped there and
// can walk behind everything above it
