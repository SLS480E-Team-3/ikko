'use client'

import { useEffect, useState } from "react"
import { playLine, stopLine } from "./voice" // import: **speech (speakJa / stopSpeech)** -> **voice (playLine / stopLine)**, reason: lines play recorded mp3s now

export type Dialog = {
    condition: 'greeting' | 'spoken' | 'questCleared' | 'default' // so on // condition: **spoken | questCleared | default** -> **+ greeting**, reason: NPC data is one Dialog[] now, mechanism: the greeting shown in range is just the entry tagged 'greeting'
    jp: string | string[], en: string | string[]
    audio?: string | string[] // audio: **none** -> **audio?**, reason: lines play recorded mp3s, mechanism: file name (no .mp3) per jp line, index-aligned; missing = silent. NPCRenderer turns it into a URL with the NPC's voice folder
}

type DialogBubbleProps = {
    x?: number, // entity CENTER in world px, same anchor EntityRenderer / the name tag use
    y?: number,
    h: number, // h: **optional, default ENT_H** -> **required**, mechanism: EntityRenderer now renders the bubble and always has ent.h, so the ENT_H import is dropped; importing entityRenderer here would be a circular import (it imports this file), same reason gustRenderer takes plain x/y/w/h
    tapId?: number, // tapId: **none** -> **tapId?**, reason: NPCs are picked by tapping their bubble, mechanism: set as the data-npc attribute on the wrapper, which GameScene's stick overlay hit-tests by rect (the bubble itself stays pointerEvents none)
    audio?: string, // speak: **speak?: NPCVoice** -> **audio?: string**, reason: speechSynthesis replaced by recorded mp3s, mechanism: URL of the clip played when the bubble shows; left out = silent (EntityRenderer's bubbles, lines with no recording)
    dialogs: Dialog[] // text, en: **text?, en?** -> **dialog: Dialog[]**, reason: a line's Japanese and English travel together with the condition they're said under, mechanism: each Dialog's jp lines page as before and en[i] types under jp[i]; the entries play in order, so the caller picks which ones (by condition) to pass
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
const TAIL_INNER = Math.round(TAIL + BUBBLE_BORDER_W - BUBBLE_BORDER_W * Math.SQRT2)
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

const PAGE_CHARS = 15 // characters shown at once // PAGE_CHARS: **12** -> **15**, mechanism: lines up to 15 characters now fit one page instead of spilling a few characters onto a second
const TYPE_MS = 70 // delay between typed characters
const PAGE_HOLD_MS = 1200 // how long a full page stays before the next one types
// a page is at most PAGE_CHARS characters; 15 at fontSize 8 (120px) fits inside
// BUBBLE_MAX_W 128, so a page is always one line
const BUBBLE_MAX_W = 128 // BUBBLE_MAX_W: **maxWidth 120** -> **128**, mechanism: 15 full-width characters are exactly 120px, so 8px of slack keeps sub-pixel rounding from wrapping the last one

const JA_FONT = 8
const EN_FONT = JA_FONT * 0.35
const EN_TYPE_MS = 30 // English runs ~2x longer than its kana, so it types faster
// the English sits under the Japanese at 0.35 of its size: small enough to
// stay secondary, readable once a talk zooms the scene in

const toList = (text?: string | string[]) => typeof text === 'string' ? [text] : text ?? []

type Page = { chars: string[], en: string[] }

const toPages = (dialog: Dialog[]): Page[] => { // args: **(text, en)** -> **(dialog)**, mechanism: each entry's jp / en lists are paired up first, then paged the same way
    const lines = dialog.flatMap(d => { const ens = toList(d.en); return toList(d.jp).map((ja, i) => ({ ja, en: ens[i] })) })
    const pages = lines.flatMap(({ ja: line, en }) => {
        if (line === '') return []
        const chars = Array.from(line)
        const n = Math.ceil(chars.length / PAGE_CHARS)
        return Array.from({ length: n }, (_, i) => ({
            chars: chars.slice(i * PAGE_CHARS, (i + 1) * PAGE_CHARS),
            en: i === n - 1 ? Array.from(en ?? '') : [], // en: **ens[li]** -> **the line's own en**, mechanism: paired with its jp line above
        }))
    })
    return pages.length ? pages : [{ chars: Array.from('...'), en: [] }]
}
// each line is split into PAGE_CHARS chunks and the lines play in order, so
// a new line always starts on a fresh page. Array.from splits by code point,
// so a kana, kanji or emoji counts as one character, not two UTF-16 units.
// No text (undefined, '', []) becomes one '...' page, as before. A line's
// English rides on its LAST page only, so it types once the whole Japanese
// line has been read, and isn't cut into pages (it wraps instead)

// index show in front of name
export default function DialogBubble({ x, y = 0, h, dialogs, tapId, audio }: DialogBubbleProps) { // props: **text, en** -> **dialog**, mechanism: see dialog
    const pages = toPages(dialogs) // pages: **toPages(text, en)** -> **toPages(dialog)**, mechanism: each page carries its English (only a line's last page has any)
    const textKey = pages.map(p => p.chars.join('') + '\t' + p.en.join('')).join('\n') // key: **Japanese only** -> **+ English**, mechanism: a changed translation also restarts the typing
    const [typing, setTyping] = useState({ key: textKey, page: 0, n: 0, e: 0 }) // state: **{ page, n }** -> **+ e**, mechanism: e = English characters typed on this page
    const cur = typing.key === textKey ? typing : { key: textKey, page: 0, n: 0, e: 0 }
    if (cur !== typing) setTyping(cur)
    // typing: which page and how many of its characters are shown. key is the
    // text it's typing; when the text prop changes, it resets to the first
    // page during render (React's "adjust state on prop change" pattern), so
    // EntityRenderer needs no key. A joined string is compared, not the
    // array, because a caller may pass a new array with the same lines each
    // frame (GameScene re-renders every rAF tick)

    const page = pages[Math.min(cur.page, pages.length - 1)]
    useEffect(() => {
        if (cur.n < page.chars.length) {
            const t = setTimeout(() => setTyping(s => ({ ...s, n: s.n + 1 })), TYPE_MS)
            return () => clearTimeout(t)
        }
        if (cur.e < page.en.length) { // step: **none** -> **type English**, mechanism: runs only after the page's Japanese is fully typed, so the reader sees Japanese first, then its meaning
            const t = setTimeout(() => setTyping(s => ({ ...s, e: s.e + 1 })), EN_TYPE_MS)
            return () => clearTimeout(t)
        }
        if (cur.page < pages.length - 1) {
            const t = setTimeout(() => setTyping(s => ({ ...s, page: s.page + 1, n: 0, e: 0 })), PAGE_HOLD_MS) // next page: **n: 0** -> **n: 0, e: 0**, mechanism: the hold starts after the English is done, and the next page clears both
            return () => clearTimeout(t)
        }
    }, [cur.page, cur.n, cur.e, page.chars.length, page.en.length, pages.length])
    // one timer at a time: type the next character, or after a full page
    // holds, clear and start the next page. The last page stays until the
    // bubble unmounts (player walks away), and walking back remounts it from
    // page 0. Cleanup clears the timer on unmount / text change, and per-frame
    // re-renders don't restart it since the deps stay the same

    useEffect(() => {
        if (!audio) return
        playLine(audio)
        return () => stopLine(audio)
    }, [audio]) // effect: **speakJa(jaText, speak)** -> **playLine(audio)**, reason: recorded mp3s instead of speechSynthesis, mechanism: plays once as the line starts typing; keyed on the URL string, so per-frame re-renders don't replay it, and a new line or an unmount stops it

    return (
        <div
            data-npc={tapId} // attr: **none** -> **data-npc={tapId}**, mechanism: React drops an undefined attribute, so only tappable bubbles get it
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
                    fontSize: JA_FONT, // fontSize: **8** -> **JA_FONT**, mechanism: EN_FONT is derived from it
                    lineHeight: 1.3,
                    width: 'max-content',
                    maxWidth: BUBBLE_MAX_W, // maxWidth: **120** -> **BUBBLE_MAX_W**, mechanism: see BUBBLE_MAX_W
                    overflowWrap: 'anywhere',
                }}
            >
                {page.chars.slice(0, cur.n).join('')}
                <span style={{ visibility: 'hidden' }}>{page.chars.slice(cur.n).join('')}</span> {/* text: **text?.map((l,i) => l[i])** -> **typed part + hidden rest of the page**, reason: show PAGE_CHARS characters at a time, typed one by one, mechanism: the untyped rest still takes up space but isn't painted, so the bubble is sized to the whole page from the first character and doesn't grow or shift the tail while typing */}
                {page.en.length > 0 && (
                    <div style={{ fontSize: EN_FONT, lineHeight: 1.3 }}>
                        {page.en.slice(0, cur.e).join('')}
                        <span style={{ visibility: 'hidden' }}>{page.en.slice(cur.e).join('')}</span>
                    </div>
                )}
                {/* English: a block under the Japanese at EN_FONT, typed the
                    same way (typed part + hidden rest), so the bubble is sized
                    for both lines from the start and never grows mid-talk. It
                    wraps inside the same BUBBLE_MAX_W */}
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
// body: square border (radius 0), max-content width that wraps at BUBBLE_MAX_W;
// overflowWrap anywhere lets long romaji/kana without spaces break too
// tail: the black triangle hangs flush under the body; the fill triangle
// sits BUBBLE_BORDER_W higher, painting over the bottom border where they
// meet, so the outline opens into the tail instead of cutting across it
