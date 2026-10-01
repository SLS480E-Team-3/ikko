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
    'palm-tree': {
        sprite: { src: '/img/palm-tree.webp', w: 256, h: 300, alt: 'palm-tree' }, // h: **260** -> **300**, mechanism: the palm tree was remade with the new sprite.py prompt (a drawing with real proportions, not the emoji look); the new 64x75 sprite is taller
        hitBox: { x: 112, y: 240, w: 36, h: 60 }, // hitBox: **x 140, y 208, w 40, h 52** -> **x 112, y 240, w 36, h 60**, mechanism: the trunk of the new sprite, as printed by sprite.py
    },
    mushroom: {
        sprite: { src: '/img/mushroom.webp', w: 256, h: 344, alt: 'mushroom' }, // h: **304** -> **344**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    },
    volcano: {
        sprite: { src: '/img/volcano.webp', w: 256, h: 132, alt: 'volcano' }, // h: **256** -> **132**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
        hitBox: { x: 16, y: 80, w: 224, h: 52 }, // hitBox: **x: 0, y: 204, w: 256, h: 52 }** -> **x: 16, y: 80, w: 224, h: 52 }**, mechanism: the new volcano is a low wide mound (64x33); the printed box (x 64, y 104, w 144, h 28) was only the middle of its base, so it is set by hand to the lower 40% at nearly full width
    },
    'lava-lake': {
        sprite: { src: '/img/lava-lake.webp', w: 256, h: 140, alt: 'lava-lake' }, // h: **156** -> **140**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
        hitBox: { x: 12, y: 16, w: 232, h: 112 }, // hitBox: **x: 16, y: 24, w: 224, h: 120 }** -> **x: 12, y: 16, w: 232, h: 112 }**, mechanism: same hand-set rule (nearly the whole lake) for the new 64x35 sprite
    },
    rock: {
        sprite: { src: '/img/rock.webp', w: 256, h: 312, alt: 'rock' }, // h: **264** -> **312**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
        hitBox: { x: 64, y: 248, w: 144, h: 64 }, // hitBox: **x: 48, y: 212, w: 176, h: 52 }** -> **x: 64, y: 248, w: 144, h: 64 }**, mechanism: the base of the new rock, as printed by sprite.py
    },
    fire: {
        sprite: { src: '/img/fire.webp', w: 256, h: 216, alt: 'fire' }, // h: **344** -> **216**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    },
    // the tropical-island props (docs/scenes/tropical-island.md), each made
    // by python/sprite.py `make` as a 64 px wide sprite drawn 4x. mushroom
    // and fire have no hitBox, so the player walks through them; their sign
    // shows when the player overlaps the sprite. palm-tree and rock keep the printed hitBox (the base).
    // lava-lake's printed box was only the front rim; it is set by hand to
    // nearly the whole sprite, because a lake lies flat and has nothing to
    // walk behind. volcano's is set by hand too (the lower 40% of the mound)
    // entries: **coconut, apple, flower, banana** -> **removed**, mechanism: the four props are taken off island 2, so nothing uses these keys
    'beach-grass': { sprite: { src: '/img/beach-grass.webp', w: 256, h: 256, alt: 'beach-grass' } }, // h: **272** -> **256**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    seashell: { sprite: { src: '/img/seashell.webp', w: 256, h: 320, alt: 'seashell' } }, // h: **368** -> **320**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    starfish: { sprite: { src: '/img/starfish.webp', w: 256, h: 176, alt: 'starfish' } }, // h: **256** -> **176**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    driftwood: { sprite: { src: '/img/driftwood.webp', w: 256, h: 336, alt: 'driftwood' } },
    fern: { sprite: { src: '/img/fern.webp', w: 256, h: 232, alt: 'fern' } }, // h: **184** -> **232**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    'grass-tuft': { sprite: { src: '/img/grass-tuft.webp', w: 256, h: 216, alt: 'grass-tuft' } }, // h: **296** -> **216**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    clover: { sprite: { src: '/img/clover.webp', w: 256, h: 344, alt: 'clover' } }, // h: **192** -> **344**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    'small-bush': { sprite: { src: '/img/small-bush.webp', w: 256, h: 312, alt: 'small-bush' } }, // h: **224** -> **312**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    'dry-grass': { sprite: { src: '/img/dry-grass.webp', w: 256, h: 264, alt: 'dry-grass' } }, // h: **232** -> **264**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    'dead-twig': { sprite: { src: '/img/dead-twig.webp', w: 256, h: 424, alt: 'dead-twig' } }, // h: **456** -> **424**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    ember: { sprite: { src: '/img/ember.webp', w: 256, h: 336, alt: 'ember' } }, // h: **272** -> **336**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    pebbles: { sprite: { src: '/img/pebbles.webp', w: 256, h: 320, alt: 'pebbles' } }, // h: **200** -> **320**, mechanism: remade with the new sprite.py prompt; size as printed by sprite.py
    // the ground plants of tropical-island: four per section (beach, forest,
    // volcano, in that order), scattered over the flat ground by scatter()
    // in islands.ts in place of a ground texture. Each is made by
    // `sprite.py make <name>` with no reference image, as a 32 px wide
    // sprite drawn 8x (so w is 256, like the 64 px sprites drawn 4x). None
    // has a hitBox or a sign: decoration the player walks through
}
// the object catalog: one ObjectDef per kind, keyed by the name a
// PlacedObject's def uses. tower is the temp art (public/img/temp.png,
// 384x528 drawn at its own size); its hitBox covers only the foot of the
// tower near the bottom of the image, so the player is stopped there and
// can walk behind everything above it
