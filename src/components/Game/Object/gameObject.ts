// Images live in /public (e.g. /public/img/), data in src/: the object
// catalog is ./objects.ts, island maps are ../islands/island_N.ts

export type SpriteProps = { // webP or png: prefer webP
    w: number, // drawn size in world px, can differ from the image file's own size
    h: number,
    src: string, // public path, e.g. '/img/temp.png'
    alt: string
}

export type HitBox = { x: number, y: number, w: number, h: number } // hitBox: **{ w, h } from the sprite's top-left** -> **{ x, y, w, h } offset from the sprite's top-left**, mechanism: a tall sprite (tower) can block only at its base, so the player walks behind the top half
// world px, relative to the sprite's top-left corner

export type ObjectDef = {
    sprite: SpriteProps,
    hitBox?: HitBox, // allowCollision: **allowCollision + hitBox** -> **optional hitBox**, mechanism: no hitBox = walk-through, so the flag and the box can't disagree
}
// one per KIND of object (tower, tree, rock) in the catalog (./objects.ts),
// shared by every placement of it so ten trees don't repeat the sprite

export type Interaction =
    | { kind: 'sign', text: string } // interaction: **() => void** -> **data descriptor**, mechanism: a map file saves data, not functions (same reason questLogic left QuestsProps); GameScene maps kind -> behavior, sign = text bubble while the player stands next to it
// v1 = sign only; quest spots / NPC talk get added later as new union
// members, and TypeScript then flags every switch on kind that misses one

export type PlacedObject = {
    id: string, // unique within the island: React key, and what quest spots / NPCs point at
    def: string, // key into the catalog, e.g. 'tower'
    x: number, // world px, sprite top-left
    y: number,
    interaction?: Interaction,
    scale?: number // scale: **required** -> **optional**, mechanism: left out = 1 (catalog size) via applyScale's default, so normal-size placements don't need it; 2 = twice as big
}
// what an island map file saves: a list of these. Plain JSON-safe data, so
// it could move to a .json file or a db column later unchanged. GameScene
// resolves def against the catalog to get the sprite and hitBox. Depth:
// the bottom edge (y + sprite.h) sorts the draw order, so whatever stands
// lower on screen draws in front

export const applyScale = (def: ObjectDef, scale = 1): ObjectDef => ({ // scale: **number** -> **= 1**, mechanism: an undefined obj.scale falls back to 1, so callers pass obj.scale as-is
    sprite: { ...def.sprite, w: def.sprite.w * scale, h: def.sprite.h * scale },
    hitBox: def.hitBox && {
        x: def.hitBox.x * scale,
        y: def.hitBox.y * scale,
        w: def.hitBox.w * scale,
        h: def.hitBox.h * scale,
    },
})
// returns a NEW def sized for one placement: sprite w/h and the hitBox
// (offset and size) all multiply by scale, so the base still lines up with
// the drawn image. The catalog def and the image file are untouched; the
// png is only drawn bigger (ObjectRenderer's fill + pixelated keeps it sharp)
