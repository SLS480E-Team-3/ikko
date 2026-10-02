import type { Condition, Dialog } from "../Entity/dialogBubble"
import type { NPCProps } from "../Entity/npcRenderer"
import { ENT_H, ENT_W } from "../Entity/entityRenderer"
import { CLIP_SEP } from "../Entity/voice"

export type ScriptLine = { kana: string, text?: string, en: string, style?: string }
export type ScriptEntry = { condition: string | string[], choices?: string[][], lines: ScriptLine[] }
export type NpcScript = { npc: string, name: string, color: string, kana?: string, dialog: ScriptEntry[] }
// the shape of one npcs/dialogs/<npc>.json (written by the /make-dialog
// skill, also read by python/dialog.py render). condition and choices are
// loose here (string, string[][]) because that is how TypeScript types an
// imported .json; conditionOf() below checks the labels when the file is
// turned into Dialogs

const CONDITION = /^(greeting|default|spoken|quest|questCleared|retry|level\d+-(start|clear|fail))$/
const conditionOf = (label: string, npc: string): Condition => {
    if (!CONDITION.test(label)) throw new Error(`dialogs/${npc}.json: unknown condition '${label}'`)
    return label as Condition
}
// the Condition type as a runtime check: a json label is only a string to
// the compiler, so a typo ('level1-clera') is caught here, when the module
// loads, with the file named in the error

export const audioName = (text: string) => text.replace(/[！!、,〜~。.／/\\ 　\n]/g, '') || 'line'
// a line's mp3 name (no .mp3): its text with ！ 、 〜 。 slashes and spaces
// dropped and ？ kept. The same rule as audio_name in python/gemini_tts.py,
// which names the file dialog.py render writes, so the two always agree

export type SceneDialog = Dialog & { jp: string[], en: string[], audio: string[] }
// a Dialog whose jp / en / audio are always arrays, index-aligned per line

const clipsOf = (text: string, target?: string) => text.split('{target}')
    .flatMap((piece, i, all) => [piece.trim() ? audioName(piece) : '', i < all.length - 1 ? target ?? '' : ''])
    .filter(Boolean).join(CLIP_SEP)
// the mp3 name(s) of a line's text. {target} cuts the text into pieces: each
// piece is its own clip (named by audioName, the same pieces dialog.py
// renders) and {target} itself is the kana's own clip (<kana>.mp3 in the same
// voice folder). The names are joined by CLIP_SEP, which lineUrl (voice.ts)
// turns into urls played in a row: '今回のお題は{target}' with target あ gives
// '今回のお題は|あ'

const fill = (s: string, target?: string) => target === undefined ? s : s.split('{target}').join(target)

export const toDialogs = (script: NpcScript, target?: string): SceneDialog[] => script.dialog.flatMap(entry => {
    const lines = entry.lines.filter(l => target !== undefined || !l.kana.includes('{target}'))
    const labels = Array.isArray(entry.condition) ? entry.condition : [entry.condition]
    return labels.map(label => ({
        condition: conditionOf(label, script.npc),
        jp: lines.map(l => fill(l.kana, target)),
        en: lines.map(l => fill(l.en, target)),
        audio: lines.map(l => l.text ? clipsOf(l.text, target) : ''), // audio: **audioName(text)** -> **clipsOf(text, target)**, mechanism: a text with {target} becomes several clip names joined by CLIP_SEP; a plain text gives audioName(text) as before
        ...(entry.choices && { choices: entry.choices.map(([jp, en]) => ({ jp, en })) }),
    }))
})
// every entry of the file as a Dialog, in file order. An entry with a list
// of conditions gives one Dialog per label, with the same lines. jp is the
// kana line (what the player reads), audio the mp3 name made from the kanji
// text (see clipsOf); a line with no text is silent (''). {target} in kana
// / en is replaced by the quest's kana, and such a line is left out when no
// target is given

export const toNPCProps = (script: NpcScript, x = 0, y = 0, dialog: Dialog[] = toDialogs(script)): NPCProps => ({
    voice: script.npc,
    ent: { name: script.name, x, y, w: ENT_W, h: ENT_H, color: script.color, facing: 'none' },
    kana: script.kana,
    dialog,
})
// one NPC from its file: every NPC shares the default body size and stands
// still (facing none). x / y default to 0 because an island NPC gets its
// spot from placeNpcs (npcs/index.ts); the Quest Island passes its own spot
// and the Dialogs of the current scene

export const sceneDialog = (script: NpcScript, condition: Condition, target?: string): Dialog[] => {
    const d = toDialogs(script, target).find(e => e.condition === condition)
    if (!d) return []
    const i = Math.max(0, d.audio.findIndex(a => a !== '' && !a.includes(CLIP_SEP))) // greeting: **first line with an mp3** -> **first line with one whole clip**, mechanism: a {target} line is voiced now (several clips), and it stays out of the greeting as before
    const greeting: Dialog = { condition: 'greeting', jp: [d.jp[i]], en: [d.en[i]], audio: [d.audio[i]] }
    return condition.endsWith('-start') ? [greeting] : [greeting, { ...d, condition: d.choices ? 'quest' : 'default' }]
}
// the Dialogs of one Quest Island scene (a level<N>-... / retry / quest
// entry), relabelled to the conditions pickDialog and greeting already read
// (npcRenderer.tsx), so the renderer and GameScene do not change:
// - greeting (shown in range): the entry's first line said as one clip, so
//   a {target} line is skipped
// - the talk: the whole entry as 'quest' when it has choices (GameScene
//   sends the picked choice to onChoice), else as 'default'
// - a level<N>-start entry is said while the level runs, so it is the
//   greeting only
// An NPC with no entry for the condition gets no dialog
