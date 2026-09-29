export const dialogUrl = (voice: string, file: string) => `/dialog/${encodeURIComponent(voice)}/${encodeURIComponent(file)}.mp3`
// a recorded line lives at public/dialog/<voice>/<file>.mp3. Both parts are
// encoded since file names are Japanese and may hold '？', which would
// otherwise end the path and start a query string

const VOLUME = 0.6
// dialog clips play 15% quieter than the recordings (0..1 scale). iOS Safari
// ignores <audio>.volume (only the hardware buttons set it), so there they
// stay at full volume

let clip: HTMLAudioElement | undefined
let current: string | undefined

export const playLine = (url: string) => {
    if (typeof Audio === 'undefined') return
    clip ??= new Audio()
    clip.volume = VOLUME // volume: **1 (default)** -> **VOLUME (0.85)**, reason: clips were too loud, mechanism: set on the shared <audio> before each play
    clip.pause()
    clip.src = url
    current = url
    clip.play().catch(() => {})
}
// one shared <audio>, so a new line cuts off the one before instead of
// overlapping. play() rejects with NotAllowedError until the page has had a
// tap / click (so an in-range greeting is silent before that) and with
// AbortError when the src is swapped mid-load; both are fine to ignore

export const stopLine = (url?: string) => {
    if (!clip || (url && url !== current)) return
    clip.pause()
    clip.currentTime = 0
    current = undefined
}
// stops the clip, but only if it's still the one this caller started: when a
// greeting bubble is replaced by a talk bubble (or StrictMode re-runs an
// effect), the old bubble's cleanup can run after the new clip started, and
// must not cut it off

export const playSfx = (url: string) => {
    if (typeof Audio === 'undefined') return
    const sfx = new Audio(url)
    sfx.volume = VOLUME
    sfx.play().catch(() => {})
}
// a fresh <audio> per effect, separate from the dialog clip, so a sound
// effect plays over (and never cuts off) the line that's talking, and two
// quick hits overlap instead of restarting each other

const BGM_VOLUME = VOLUME * 0.2
// background music sits at 20% of the dialog volume, so it never covers a
// line (same iOS caveat as VOLUME: Safari plays it at full volume)

export const ISLAND_BGM: Record<number, string> = {
    1: '/BGM/8bits/canon-3_8bit.mp3',
}
// one looping track per island, by island id; an island without an entry is silent

export const QUEST_BGM = {
    clear: '/BGM/8bits/04 Menuet_8bit.mp3',
    fail: '/BGM/8bits/03 Menuet_8bit.mp3',
}
// quest result music, looped at the same BGM_VOLUME: clear plays once both
// levels are done, fail once hp or time runs out. The spaces in the file
// names are fine, since Audio percent-encodes the URL

const playing = new Set<() => void>()
// the stop function of every BGM still running, so stopBgm can silence them
// all at once

export const playBgm = (url: string) => {
    if (typeof Audio === 'undefined') return () => {}
    const bgm = new Audio(url)
    bgm.loop = true
    bgm.volume = BGM_VOLUME
    let stopped = false
    const start = () => { if (!stopped) bgm.play().then(() => { if (stopped) bgm.pause(); else window.removeEventListener('pointerdown', start) }).catch(() => {}) } // start: **play, then drop the listener** -> **skip / re-pause once stopped**, mechanism: a play() that resolves after the cleanup ran (a tap racing the scene change) pauses right away instead of looping on under the next scene
    const stop = () => {
        stopped = true
        playing.delete(stop)
        window.removeEventListener('pointerdown', start)
        bgm.pause()
        bgm.removeAttribute('src') // src: **bgm.src = ''** -> **removeAttribute('src')**, mechanism: '' resolves to the page URL and starts loading it as media; removing the attribute just empties the element
        bgm.load()
    }
    playing.add(stop)
    window.addEventListener('pointerdown', start)
    start()
    return stop
}
// a looping <audio> of its own, apart from the dialog clip and SFX. play()
// is refused until the page has had a tap, so the first pointerdown retries
// it and the listener goes away once playback starts. Returns a stop
// function for a useEffect cleanup; clearing src drops the download too

export const stopBgm = () => { playing.forEach(stop => stop()) }
// stops every BGM this module started, for a scene that must start silent
// (the quest island) whatever the previous scene left behind
