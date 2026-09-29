import { BUBBLE_BG, BUBBLE_BOARDER, BUBBLE_BORDER_W, BUBBLE_SHADOW } from "./dialogBubble"

export const CHAR_BLOCK_SIZE = 44 // size: **16** -> **32**, mechanism: twice as big; the training hit test imports this, so the catch box grows with it // size: **32** -> **64**, mechanism: twice as big again; kana / romaji font sizes scale off size // size: **64** -> **44**, mechanism: smaller box; the kana keeps its 32px via KANA_FONT, so only the frame shrinks
export const KANA_FONT = 32
// kana font px, fixed so the box can change size without the text changing
// world px. Entities are 12x20 (ENT_W / ENT_H), so a 16px square reads as a
// thrown crate a bit wider than the player, and its kana stays legible at the
// scene's zoom. Exported so the training hit test uses the same size it draws

export default function CharBlock({ kana, romaji, x, y, size = CHAR_BLOCK_SIZE }: { kana: string, romaji?: string, x: number, y: number, size?: number }) {
    return (
        <div
            style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                transform: 'translate(-50%, -50%)',
                boxSizing: 'border-box',
                border: `${BUBBLE_BORDER_W}px solid ${BUBBLE_BOARDER}`,
                background: BUBBLE_BG,
                color: 'black',
                boxShadow: `2px 2px 0 ${BUBBLE_SHADOW}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                pointerEvents: 'none',
                userSelect: 'none',
                zIndex: Math.round(y + size / 2),
            }}
        >
            <div style={{ fontSize: KANA_FONT }}>{kana}</div> {/* font: **size * 0.5** -> **KANA_FONT**, mechanism: same 32px it had at size 64, independent of the box */}
            {romaji && <div style={{ fontSize: size * 0.2, marginTop: 1 }}>{romaji}</div>}
        </div>
    )
}
// center-anchored like entities (left/top at x, y, then translate -50%), so
// the training's overlaps() hit test and the drawing agree on where the block
// is. The frame copies DialogBubble's body: BUBBLE_BG fill, BUBBLE_BORDER_W
// black square border, and a flat no-blur shadow offset down-right (box-shadow
// instead of drop-shadow since the block is a plain rectangle). border-box
// keeps the outer size exactly size x size. The kana sits at half the size
// with its romaji at a fifth under it, centered by a column flexbox.
// zIndex is the bottom edge, the same rule the player / NPC / object wrappers
// use, so a block flying below an entity draws in front of it and above it
// draws behind. pointerEvents none keeps the stick and NPC taps working
