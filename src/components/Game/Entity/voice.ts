export const dialogUrl = (voice: string, file: string) => `/dialog/${encodeURIComponent(voice)}/${encodeURIComponent(file)}.mp3`
// a recorded line lives at public/dialog/<voice>/<file>.mp3. Both parts are
// encoded since file names are Japanese and may hold '？', which would
// otherwise end the path and start a query string

const VOLUME = 0.25
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
