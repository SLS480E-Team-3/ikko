export const dialogUrl = (voice: string, file: string) => `/dialog/${encodeURIComponent(voice)}/${encodeURIComponent(file)}.mp3`
// a recorded line lives at public/dialog/<voice>/<file>.mp3. Both parts are
// encoded since file names are Japanese and may hold '？', which would
// otherwise end the path and start a query string

const VOLUME = 0.6
// dialog clips play 15% quieter than the recordings (0..1 scale). iOS Safari
// ignores <audio>.volume (only the hardware buttons set it), so there they
// stay at full volume

const MUTE_KEY = 'ikko-muted'
let muted = false
try { muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1' } catch {}
const muteListeners = new Set<() => void>()
const elements = new Set<HTMLAudioElement>()
let master: GainNode | undefined
// mute state for the whole module: one flag, read back from localStorage so
// it survives a reload (try/catch: storage throws in private mode). elements
// holds every live <audio> (the dialog clip + running BGMs) and master is the
// gain node all buffer sources pass through, so a toggle reaches both paths

export const isMuted = () => muted
export const onMuteChange = (fn: () => void) => { muteListeners.add(fn); return () => { muteListeners.delete(fn) } }
export const setMuted = (m: boolean) => {
    muted = m
    try { localStorage.setItem(MUTE_KEY, m ? '1' : '0') } catch {}
    if (master) master.gain.value = m ? 0 : 1
    elements.forEach(a => { a.muted = m })
    muteListeners.forEach(fn => fn())
}
// usage: setMuted(!isMuted()); onMuteChange + isMuted are the subscribe /
// snapshot pair for useSyncExternalStore (see MuteButton). <audio> elements
// are silenced with .muted, not volume 0, because iOS Safari ignores
// <audio>.volume; the sounds keep running while muted, so unmuting brings
// the BGM back mid-track instead of restarting it

let ctx: AudioContext | undefined
const buffers = new Map<string, AudioBuffer>()
const loads = new Map<string, Promise<void>>()

const audioCtx = () => {
    if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return undefined
    if (!ctx) {
        ctx = new AudioContext()
        const c = ctx
        master = c.createGain()
        master.gain.value = muted ? 0 : 1
        master.connect(c.destination)
        // master gain between every buffer source and the speakers: 1 normally, 0 while muted
        const unlock = () => { c.resume().then(() => { if (c.state === 'running') window.removeEventListener('pointerdown', unlock) }).catch(() => {}) }
        window.addEventListener('pointerdown', unlock)
    }
    return ctx
}
// one shared Web Audio context, made on first use. Phones keep it suspended
// until a tap, so each pointerdown tries resume() until it is running.
// Fetching and decoding work while suspended; only playback waits

const load = (url: string) => {
    const c = audioCtx()
    if (!c) return
    if (!loads.has(url)) loads.set(url, fetch(url)
        .then(r => r.ok ? r.arrayBuffer() : Promise.reject(r.status))
        .then(bytes => c.decodeAudioData(bytes))
        .then(buf => { buffers.set(url, buf) })
        .catch(() => {}))
}
// fetches and decodes one clip into buffers. loads keeps the promise, so a
// url is only ever requested once, even when it failed (a line with no mp3)

export const preloadClips = (urls: string[]) => { urls.forEach(load) }
// usage: preloadClips([dialogUrl('ryuuko', 'あ'), '/_SFX/hit.mp3'])
// called ahead of time (GameScene for a scene's NPC lines, the trainings for
// their catch sounds), so playLine / playSfx find the decoded buffer ready

const startBuffer = (url: string) => {
    const buf = buffers.get(url)
    if (!ctx || !buf || ctx.state !== 'running') return undefined
    const src = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = VOLUME
    src.buffer = buf
    src.connect(gain).connect(master ?? ctx.destination) // output: **ctx.destination** -> **master gain**, mechanism: setMuted sets master's gain to 0, which silences every buffer source, including ones already playing
    src.start()
    return src
}
// plays a decoded clip: no fetch, no decode and no <audio> element at play
// time, which is what made a catch hitch on phones. The gain node sets the
// volume, and unlike <audio>.volume it also works on iOS. Returns undefined
// when the buffer isn't ready or the context is still suspended, so the
// caller falls back to <audio>

let clip: HTMLAudioElement | undefined
let voice: AudioBufferSourceNode | undefined
let current: string | undefined

const stopVoice = () => {
    try { voice?.stop() } catch {}
    voice = undefined
    clip?.pause()
}
// silences the running line on both paths (buffer source and <audio>)

export const playLine = (url: string) => {
    if (typeof Audio === 'undefined') return
    stopVoice()
    current = url
    voice = startBuffer(url) // play: **always <audio> src swap** -> **decoded buffer first**, mechanism: a preloaded clip starts from memory, so the line isn't delayed by a fetch + decode
    if (voice) return
    load(url)
    clip ??= new Audio()
    elements.add(clip)
    clip.muted = muted // mute: **none** -> **clip.muted = muted**, mechanism: the shared <audio> is in elements, so setMuted also flips it mid-line
    clip.volume = VOLUME // volume: **1 (default)** -> **VOLUME (0.85)**, reason: clips were too loud, mechanism: set on the shared <audio> before each play
    clip.src = url
    clip.play().catch(() => {})
}
// one line at a time: a new line cuts off the one before instead of
// overlapping. A url that wasn't preloaded falls back to the shared <audio>
// and is loaded for next time. play() rejects with NotAllowedError until the
// page has had a tap / click (so an in-range greeting is silent before that)
// and with AbortError when the src is swapped mid-load; both are fine to ignore

export const stopLine = (url?: string) => {
    if (url && url !== current) return
    stopVoice() // stop: **clip.pause()** -> **stopVoice()**, mechanism: also stops a line playing from a buffer
    if (clip) clip.currentTime = 0
    current = undefined
}
// stops the clip, but only if it's still the one this caller started: when a
// greeting bubble is replaced by a talk bubble (or StrictMode re-runs an
// effect), the old bubble's cleanup can run after the new clip started, and
// must not cut it off

export const playSfx = (url: string) => {
    if (typeof Audio === 'undefined') return
    if (startBuffer(url)) return // play: **new Audio(url) each time** -> **decoded buffer first**, mechanism: a buffer source per call is cheap and still overlaps other sounds
    load(url)
    const sfx = new Audio(url)
    sfx.volume = VOLUME
    sfx.muted = muted // mute: **none** -> **sfx.muted = muted**, mechanism: a short one-shot, so it only reads the flag at start and isn't tracked in elements
    sfx.play().catch(() => {})
}
// its own source per effect, separate from the dialog line, so a sound
// effect plays over (and never cuts off) the line that's talking, and two
// quick hits overlap instead of restarting each other. Falls back to a fresh
// <audio> while the buffer isn't ready

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
    bgm.muted = muted
    elements.add(bgm) // mute: **none** -> **bgm.muted + elements**, mechanism: the track keeps looping silently while muted and setMuted unmutes it in place
    let stopped = false
    const start = () => { if (!stopped) bgm.play().then(() => { if (stopped) bgm.pause(); else window.removeEventListener('pointerdown', start) }).catch(() => {}) } // start: **play, then drop the listener** -> **skip / re-pause once stopped**, mechanism: a play() that resolves after the cleanup ran (a tap racing the scene change) pauses right away instead of looping on under the next scene
    const stop = () => {
        stopped = true
        playing.delete(stop)
        elements.delete(bgm)
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
