'use client'

import { CSSProperties, Fragment, HTMLAttributes, HTMLInputAutoCompleteAttribute, MouseEvent, PointerEvent, useEffect, useRef, useState } from "react" // imports: **+ HTMLAttributes** for the inputMode type // imports: **MouseEvent** -> **PointerEvent**, reason: the box now listens for pointerdown, mechanism: see handlePointerDown

/**
 * @param text the value; pass it (with onChange) to control the input, leave it
 *   out and the input keeps its own
 * @param onChange called with the new text on every edit
 * @param onSubmit called with the text when Enter is pressed
 * @param limit max number of characters
 * @param placeholder shown greyed out while the text is empty
 * @param disabled shows the text but cannot be focused or edited
 * @param style merged over the default style
 * @param name form field name, so the value shows up in FormData
 * @param type 'password' draws every char as a dot
 * @param inputMode which phone keyboard to open (e.g. 'email')
 * @param autoCapitalize passed to the hidden input ('none' for usernames)
 * @param autoComplete passed to the hidden input (e.g. 'new-password')
 * @param required blocks the form's submit while empty
 * @returns JSX input component
 *
 * @description
 * the typical html input, but so that suits the game theme:
 * bare text on an underline, no box.
 * on click a '|' caret blinks after the selected char,
 * arrow keys move it, shift+arrows select.
 */

const BLINK_INTERVAL_MS = 530
const SELECTION_COLOR = '#dbdbdb'
const PLACEHOLDER_COLOR = '#aaaaaa'
const CARET_WIDTH = '0.15em'
// caret bar width; INPUT_STYLE's paddingLeft uses it too

type InputProps = {
    text?: string
    onChange?: (text: string) => void
    onSubmit?: (text: string) => void
    limit?: number
    placeholder?: string
    disabled?: boolean
    style?: CSSProperties
    name?: string
    type?: 'text' | 'password'
    inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
    autoCapitalize?: string
    autoComplete?: HTMLInputAutoCompleteAttribute // prop: **none** -> **autoComplete**, reason: EditInfo lost its 'new-password' hint when it moved to Input, mechanism: handed to the hidden <input> like the other form props
    required?: boolean
}
// form props, all handed straight to the hidden <input>: it is a real form
// control, so name/required make it part of the surrounding <form> the same
// way a plain <input> is. No type 'email' on purpose -- the browser turns off
// selectionStart/setSelectionRange for email inputs, and the caret drawing
// depends on both, so email fields use inputMode='email' for the keyboard
// instead

const DEFAULT_INPUT_STYLE: CSSProperties = {
    height: 20,
    minWidth: '8ch',
    borderBottom: '2px solid currentColor',
}

const INPUT_STYLE: CSSProperties = {
    position: 'relative',
    display: 'inline-block',
    whiteSpace: 'pre',
    overflow: 'hidden',
    cursor: 'text',
    userSelect: 'none',
    touchAction: 'manipulation', // style: **auto** -> **manipulation**, reason: a double tap on the field zoomed the page, mechanism: turns off double-tap zoom but keeps pan and pinch
    WebkitTapHighlightColor: 'transparent', // style: **default** -> **transparent**, reason: iOS flashed a grey box over the field on tap, mechanism: removes the tap highlight
    paddingLeft: CARET_WIDTH, // style: **0** -> **CARET_WIDTH**, reason: the caret at index 0 was drawn over the 1st char, mechanism: room for the caret bar (which sits just left of its gap) inside overflow:hidden, so '|u' shows before the 1st char
}
// `pre` for the same reason as RainbowText: every character is its own <span>,
// and collapsed whitespace between spans would eat typed spaces.
// `overflow: hidden` so a caller-given width clips long text instead of
// spilling it over the next control; an effect in Input scrolls the caret back
// into view. With no width set the box just grows and nothing is clipped.
// kept apart from DEFAULT_INPUT_STYLE because these are what make the component
// work, not how it looks -- they go first so a caller can still override them,
// but nothing here is a look to tweak.

const HIDDEN_INPUT_STYLE: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    padding: 0,
    border: 0,
    fontSize: 16, // style: **browser default** -> **16**, reason: iOS Safari zooms the page when an input under 16px gets focus, mechanism: at 16px it doesn't zoom; the input is invisible, so the size changes nothing on screen
    opacity: 0,
    pointerEvents: 'none',
}

type Selection = {
    start: number
    end: number
    backward: boolean
}

/** UTF-16 offset (what the native input reports) -> index into Array.from(text) */
function toCharIndex(text: string, offset: number): number {
    return Array.from(text.slice(0, offset)).length
}

function Caret({ visible }: { visible: boolean }) {
    return (
        <span data-caret style={{ display: 'inline-block', width: 0 }}>
            <span
                style={{
                    display: 'inline-block',
                    width: CARET_WIDTH,
                    height: '1em',
                    marginLeft: `-${CARET_WIDTH}`,
                    verticalAlign: 'text-bottom',
                    background: 'currentColor',
                    visibility: visible ? 'visible' : 'hidden',
                }}
            />
        </span>
    ) // caret: **'|' glyph pulled back 50%** -> **CSS bar ending at the gap**, reason: at index 0 the caret was drawn over the middle of the 1st char ('u' looked split), mechanism: the pixel font draws its '|' bar somewhere inside the glyph, so no offset of the glyph lined it up; a plain bar has its ink exactly where its box is, and marginLeft puts its right edge on the gap
}
// a zero-width box with the bar overflowing it to the left: the caret sits
// just before the gap instead of pushing the text after it sideways every
// time it moves or blinks. At index 0 that's INPUT_STYLE's paddingLeft, so
// overflow:hidden doesn't clip it.
// `visibility` and not unmounting, for the same reason -- nothing reflows on
// the blink.

export default function Input({ text: textProp, onChange, onSubmit, limit, placeholder, disabled, style, name, type = 'text', inputMode, autoCapitalize, autoComplete, required }: InputProps) { // props: **no form props** -> **+ name, type, inputMode, autoCapitalize, required**, reason: SignUp needs them, mechanism: see InputProps
    const boxRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const pendingOffset = useRef<number | null>(null)
    // where a touch pressed, kept until its click focuses the input (see handlePointerDown)
    const [internalText, setInternalText] = useState('')
    const controlled = textProp !== undefined
    const text = controlled ? textProp : internalText

    const [focused, setFocused] = useState(false)
    const [selection, setSelection] = useState<Selection>({ start: 0, end: 0, backward: false })
    const [caretOn, setCaretOn] = useState(true)

    useEffect(() => {
        if (!focused) return
        const timer = setInterval(() => setCaretOn(on => !on), BLINK_INTERVAL_MS)
        return () => {
            clearInterval(timer)
            setCaretOn(true)
        }
    }, [focused, selection.start, selection.end])
    // the caret restarts solid on every move, like a real text field -- a caret
    // that happens to be mid-blink when you press an arrow key looks like it
    // vanished. Reset in the cleanup, as in RainbowText, so a move runs the
    // cleanup (solid) and then starts a fresh interval.
    // start/end and not `selection`: syncSelection builds a new object even
    // when nothing moved, which would restart the blink for nothing.

    useEffect(() => {
        if (!focused) return
        boxRef.current?.querySelector('[data-caret]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [focused, selection.start, selection.end, text])
    // keeps the caret inside a clipped box: typing past the width, or pressing
    // End, would otherwise move it out of sight. 'nearest' does nothing while it
    // is already visible, so the text only slides when it has to.

    function syncSelection() {
        const input = inputRef.current
        if (!input) return
        setSelection({
            start: input.selectionStart ?? 0,
            end: input.selectionEnd ?? 0,
            backward: input.selectionDirection === 'backward',
        })
    }
    // the hidden <input> owns the real cursor; this only mirrors it so the
    // visible text can draw it.

    useEffect(() => {
        if (!focused) return
        document.addEventListener('selectionchange', syncSelection, true)
        return () => document.removeEventListener('selectionchange', syncSelection, true)
    }, [focused])
    // the native event, not React's onSelect: onSelect only re-reads the cursor
    // on keydown/keyup, and keydown lands BEFORE the cursor moves -- so holding
    // an arrow key left the drawn caret a step behind until the key came up.
    // Capture on document because browsers disagree on where it is fired (the
    // input itself in newer ones, document in older), and capture sees both.
    // syncSelection is recreated every render, but it only reads the ref, so
    // the one registered on focus is as good as the latest.

    const chars = Array.from(text)

    function handlePointerDown(e: PointerEvent<HTMLDivElement>) { // handler: **handleMouseDown(MouseEvent)** -> **handlePointerDown(PointerEvent)**, reason: a tap on a phone only reached it if the browser turned the tap into mouse events, mechanism: pointerdown fires for mouse, touch and pen; its preventDefault also stops the mousedown the browser would send after a tap, which would pull focus back off the hidden input
        e.preventDefault()
        e.stopPropagation()
        const input = inputRef.current
        if (!input || disabled) return

        const charSpan = (e.target as HTMLElement).closest<HTMLElement>('[data-char-index]')
        let index = chars.length
        if (charSpan) {
            const i = Number(charSpan.dataset.charIndex)
            const rect = charSpan.getBoundingClientRect()
            index = e.clientX > rect.left + rect.width / 2 ? i + 1 : i
        }
        const offset = chars.slice(0, index).join('').length

        if (e.pointerType !== 'mouse') { // focus: **on pointerdown for all** -> **on click for touch/pen**, reason: on iPhone the field lost focus as soon as the finger lifted (it only stayed selected while held), mechanism: iOS handles the tap on the unfocusable div at touchend and blurs the input; click comes after that, so focusing there sticks (and still counts as a user gesture, so the keyboard opens)
            pendingOffset.current = offset
            return
        }
        placeCaret(offset)
    }

    function placeCaret(offset: number) {
        const input = inputRef.current
        if (!input) return
        input.focus()
        input.setSelectionRange(offset, offset)
        syncSelection()
    }
    // shared by the mouse path (right away on pointerdown) and the touch path
    // (on click, from the offset worked out on pointerdown)

    function handleClick(e: MouseEvent<HTMLDivElement>) {
        e.stopPropagation()
        const offset = pendingOffset.current
        if (offset === null || disabled) return
        pendingOffset.current = null
        placeCaret(offset)
    }
    // the offset is read on pointerdown, where the touch point is, and applied
    // here. null means the press was a mouse one (already handled) or there
    // was no press on this box, so a stray click does nothing
    // the hidden input is 1px wide and ignores the mouse, so the browser cannot
    // place the cursor from a click -- it is worked out here from which
    // character was hit. Right half of a char puts the caret after it, left
    // half before it; anywhere that is not a char (the empty space after the
    // text, the placeholder) goes to the end.
    // preventDefault so the mousedown does not pull focus back off the input
    // right after focus() puts it there. stopPropagation so the game's window
    // mousedown listener does not treat clicking the field as clicking the world.

    const start = toCharIndex(text, selection.start)
    const end = toCharIndex(text, selection.end)
    const caretIndex = selection.backward ? start : end
    const showCaret = focused && start === end

    return (
        <div
            ref={boxRef}
            onClick={handleClick} // handler: **none** -> **onClick**, reason: touch focus moved here, mechanism: see handleClick
            onPointerDown={handlePointerDown} // handler: **onMouseDown** -> **onPointerDown**, reason: see handlePointerDown, mechanism: stopPropagation there now also keeps the tap from reaching MobileGameScene's pinch/joystick handlers
            style={{ ...INPUT_STYLE, ...DEFAULT_INPUT_STYLE, ...(disabled && { cursor: 'default' }), ...style }}
        >
            <input
                ref={inputRef}
                value={text}
                name={name}
                type={type}
                inputMode={inputMode}
                autoCapitalize={autoCapitalize}
                autoComplete={autoComplete} // attr: **none** -> **autoComplete**, reason: see InputProps, mechanism: password managers read it off the real (hidden) input
                required={required}
                maxLength={limit}
                disabled={disabled}
                aria-label={placeholder}
                onChange={(e) => {
                    if (!controlled) setInternalText(e.target.value)
                    onChange?.(e.target.value)
                    syncSelection()
                }}
                onFocus={() => {
                    setFocused(true)
                    syncSelection()
                }}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        inputRef.current?.blur()
                        return
                    }
                    e.stopPropagation()
                    if (e.key === 'Enter') onSubmit?.(text)
                }}
                onKeyUp={(e) => {
                    if (e.key !== 'Escape') e.stopPropagation()
                }}
                style={HIDDEN_INPUT_STYLE}
            />
            {chars.map((char, i) => (
                <Fragment key={i}>
                    {showCaret && caretIndex === i && <Caret visible={caretOn} />}
                    <span
                        data-char-index={i}
                        style={{ background: focused && i >= start && i < end ? SELECTION_COLOR : undefined }}
                    >
                        {/* text: **char** -> **• for passwords**, reason: a password field showed the password, mechanism: one dot per char keeps the char spans (and caret placement) lined up with the real text */}
                        {type === 'password' ? '•' : char}
                    </span>
                </Fragment>
            ))}
            {showCaret && caretIndex === chars.length && <Caret visible={caretOn} />}
            {chars.length === 0 && placeholder !== undefined && (
                <span style={{ color: PLACEHOLDER_COLOR }}>{placeholder}</span>
            )}
        </div>
    )
}
// a real <input>, hidden, rather than keydown handling on the div: it brings
// typing, paste, IME, undo, arrow/Home/End and `limit` (maxLength) for free,
// and the rest of the app's "is the user typing?" checks
// (`activeElement instanceof HTMLInputElement`, e.g. TabBar) keep working.
//
// keys stop propagating so the game's window keydown/keyup listeners do not
// walk the player while its name is being typed. Escape is the exception: it
// blurs the field and still bubbles, so whatever closes on Escape still closes
// (the Scripter popup does).
//
// no caret while a range is selected -- the highlight already shows where the
// selection is, and a native field hides its caret then too.
//
// `disabled` goes onto the hidden input too, so a disabled field cannot be
// tabbed into either -- not only clicked.
