export type NPCVoice = 'female' | 'male' | (string & {})
// 'female' / 'male' picks a voice by gender; any other string is a voice
// name like 'Hattori'. (string & {}) keeps the two literals in autocomplete,
// a plain | string would collapse the whole union to string

const SPEECH_RATE = 0.85
const PITCH = { female: 1.2, male: 0.8 }
const VOICE_GENDER: Record<'female' | 'male', string[]> = {
    female: ['kyoko', 'o-ren', 'flo', 'grandma', 'sandy', 'shelley', 'ayumi', 'haruka', 'nanami', 'sayaka', 'google 日本語'],
    male: ['otoya', 'hattori', 'eddy', 'grandpa', 'reed', 'rocko', 'ichiro', 'keita'],
}
// rate: a little slower than normal for beginners
// VOICE_GENDER: the Web Speech API doesn't say a voice's gender, so known
// Japanese voice names (lowercase) decide it, listed best first. PITCH is only used when no
// installed voice matches the gender, so male / female still sound apart
// on a phone with a single Japanese voice

const synth = () => typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : undefined
// undefined on the server or in browsers without speech, so every helper
// below just does nothing there

synth()?.getVoices()
// asking once at load starts the voice list loading (Chrome / Safari fill it
// in async), so it's ready by the first talk instead of the first line
// falling back to no voice + PITCH

const genderOf = (name: string): 'female' | 'male' | undefined => {
    const n = name.toLowerCase()
    return (['female', 'male'] as const).find(g => VOICE_GENDER[g].some(k => n.includes(k)))
}

export const pickVoice = (voice: NPCVoice): { voice?: SpeechSynthesisVoice, pitch: number } => {
    const ja = synth()?.getVoices().filter(v => v.lang.replace('_', '-').toLowerCase().startsWith('ja')) ?? []
    if (voice !== 'female' && voice !== 'male') {
        const named = ja.find(v => v.name.toLowerCase().includes(voice.toLowerCase()))
        if (named) return { voice: named, pitch: 1 }
        const g = genderOf(voice)
        if (!g) return { voice: ja[0], pitch: 1 }
        voice = g
    }
    const g = voice as 'female' | 'male'
    const match = VOICE_GENDER[g].map(k => ja.find(v => v.name.toLowerCase().includes(k))).find(v => v) // match: **first ja voice of g in getVoices() order** -> **first installed name in VOICE_GENDER order**, reason: macOS lists Flo / Eddy (robotic Eloquence voices) before Kyoko, mechanism: the table is a preference list, so natural voices (Kyoko, Otoya) are tried before the novelty ones
    return match ? { voice: match, pitch: 1 } : { voice: ja[0], pitch: PITCH[g] }
}
// deterministic, not random: the same installed voices always give the same
// pick. A name uses that exact voice if installed; if not, a known name
// falls back to its gender (Hattori -> male) and an unknown one to the first
// ja voice. A gender takes the first installed voice in its VOICE_GENDER
// list (so every 'female' NPC shares it), else any ja voice + PITCH.
// Looked up on every call, since getVoices() is empty until voiceschanged

let pending: SpeechSynthesisUtterance | undefined
let timer: ReturnType<typeof setTimeout> | undefined

const flushPending = () => {
    const s = synth()
    if (!s || !pending) return
    s.resume()
    s.speak(pending)
    pending = undefined
}
// speaks the line that was waiting for the page's first click / tap / key.
// Runs inside that event, so it counts as a user gesture

const hasGesture = () => {
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    return !ua || ua.hasBeenActive
}
// Chrome rejects speak() with 'not-allowed' until the page has had a user
// gesture. Browsers without userActivation are treated as allowed

export const speakJa = (text: string, voice: NPCVoice) => {
    const s = synth()
    if (!s) return
    stopSpeech()
    const u = new SpeechSynthesisUtterance(text)
    const picked = pickVoice(voice)
    u.lang = 'ja-JP'
    u.rate = SPEECH_RATE
    u.pitch = picked.pitch
    if (picked.voice) u.voice = picked.voice
    if (!hasGesture()) { // speak: **always right away** -> **held until the first gesture**, reason: Chrome silently drops (error 'not-allowed') a speak() before any click, e.g. MobileTester's bubble speaking on mount after a reload, mechanism: the utterance is kept and flushPending speaks it on the first pointerdown / keydown
        pending = u
        for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, flushPending, { once: true, capture: true })
        return
    }
    timer = setTimeout(() => { s.resume(); s.speak(u) }, 0) // speak: **right after cancel()** -> **next tick + resume()**, reason: Chrome can drop a speak() made in the same tick as cancel(), or stay paused after one, mechanism: the cancel settles first and resume() clears a stuck pause
}
// cancel first so a new line cuts off the previous one instead of queueing.
// With no ja voice installed, lang alone lets the browser choose one

export const stopSpeech = () => { // stopSpeech: **cancel()** -> **also clears the queued / held line**, mechanism: a line still waiting on the timer or a gesture must not play after its bubble is gone
    clearTimeout(timer)
    pending = undefined
    synth()?.cancel()
}

let unlocked = false
export const unlockSpeech = () => {
    const s = synth()
    if (!s || unlocked) return
    unlocked = true
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    s.speak(u)
}
// iOS Safari only lets a page speak after a speak() made inside a user
// gesture. Talk lines start later (in an effect after the zoom settles), so
// the tap that starts a talk calls this once with a silent utterance
