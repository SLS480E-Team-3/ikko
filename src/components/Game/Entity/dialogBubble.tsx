'use client'

type DialogBubbleProps = {
    x?: number, // entity CENTER in world px, same anchor EntityRenderer / the name tag use
    y?: number,
    h: number, // h: **optional, default ENT_H** -> **required**, mechanism: EntityRenderer now renders the bubble and always has ent.h, so the ENT_H import is dropped; importing entityRenderer here would be a circular import (it imports this file), same reason gustRenderer takes plain x/y/w/h
    text: string,
}
// the bubble takes the entity's position, not its own, so a caller passes
// the same x/y/h it gives EntityRenderer and the bubble finds the top itself

const BUBBLE_GAP = 25
const BUBBLE_BOARDER = 'black'
const BUBBLE_TEXT = 'black'
const BUBBLE_BG = '#fffff2'

const BUBBLE_BORDER_W = 2
const TAIL = 6 // tail height = half its width, so the slanted sides are 45°
const BUBBLE_SHADOW = 'rgba(0,0,0,0.18)'
const SEAM = 1 // SEAM: **none** -> **1**, mechanism: how far (world px) the fill triangle reaches up into the body fill, so the anti-aliased seam between them is hidden
const TAIL_INNER =Math.round(TAIL + BUBBLE_BORDER_W - BUBBLE_BORDER_W * Math.SQRT2)
// world px. TAIL_INNER is the fill triangle: it starts BUBBLE_BORDER_W higher
// (over the body's bottom border) and a 45° side's border measured
// sideways is B·√2, so this size leaves a ~BUBBLE_BORDER_W black edge on
// both slants and a tip that thick at the bottom

const triangle = (half: number, color: string, top: string) => ({
    position: 'absolute' as const,
    left: '50%',
    top,
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: `${half}px solid transparent`,
    borderRight: `${half}px solid transparent`,
    borderTop: `${half}px solid ${color}`,
})
// a 0x0 box with only a colored top border draws a down-pointing triangle
// (half wide on each side, half tall); left 50% + translateX centers it

// index show in front of name
export default function DialogBubble({ x, y = 0, h, text }: DialogBubbleProps) {
    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y - h / 2 - BUBBLE_GAP,
                transform: 'translate(-50%, -100%)',
                paddingBottom: TAIL,
                filter: `drop-shadow(3px 3px 0 ${BUBBLE_SHADOW})`,
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: 2,
            }}
        >
            <div
                style={{
                    border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`,
                    borderRadius: 0,
                    background: BUBBLE_BG,
                    color: BUBBLE_TEXT,
                    padding: '2px 6px',
                    fontSize: 8,
                    lineHeight: 1.3,
                    width: 'max-content',
                    maxWidth: 120,
                    overflowWrap: 'anywhere',
                }}
            >
                {!text? '...' : text}
            </div>
            <div style={triangle(TAIL, BUBBLE_BOARDER, `calc(100% - ${TAIL}px)`)} />
            <div style={triangle(TAIL_INNER + SEAM, BUBBLE_BG, `calc(100% - ${TAIL + BUBBLE_BORDER_W + SEAM}px)`)} /> {/* fill triangle: **top at the border's top edge, size TAIL_INNER** -> **SEAM px higher and SEAM px bigger**, mechanism: its top edge used to land exactly on the body fill's bottom edge, and the anti-aliased edges of the two boxes left a thin line at the scene zoom; now it overlaps the body fill by SEAM px, so no edge meets there. At 45° a triangle SEAM higher and SEAM bigger has the same slanted sides, so the black outline of the tail doesn't change */}
        </div>
    )
}
// wrapper: its top is the entity's top minus BUBBLE_GAP, and translate
// (-50%, -100%) lifts it so its BOTTOM (the tail tip) sits there, centered
// on x, clearing the name tag. paddingBottom reserves the tail's room inside
// the wrapper. drop-shadow (no blur) follows the painted pixels, so the
// square body and the triangle share one flat bottom-right shadow like the
// reference. Rendered as a sibling of the body, so the lean skew doesn't
// reach it; zIndex 2 keeps it above the name tag (1)
// body: square border (radius 0), max-content width that wraps at 120px;
// overflowWrap anywhere lets long romaji/kana without spaces break too
// tail: the black triangle hangs flush under the body; the fill triangle
// sits BUBBLE_BORDER_W higher, painting over the bottom border where they
// meet, so the outline opens into the tail instead of cutting across it
