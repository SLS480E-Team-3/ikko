import { NPCProps } from "../Entity/npcRenderer";
import type { Condition } from "../Entity/dialogBubble"; // import: **Dialog** -> **type Condition**, mechanism: the Dialogs are built in toNPCProps.ts now; this file only names the Quest Island scene's condition
import { playSpot, throwSpot, type TrainingPhase } from "../Scene/training"; // import: **+ LEVELS, QuestsLevel, ENT_W / ENT_H (entityRenderer)** -> **without**, mechanism: the level buttons are in ryuuko.json and the body size is set by toNPCProps
import { KANA_ROWS } from "../kana";
import { sceneDialog, toNPCProps } from "./toNPCProps";
import jordi from "./dialogs/jordi.json";
import shuto from "./dialogs/shuto.json";
import tiffany from "./dialogs/tiffany.json";
import genki from "./dialogs/genki.json";
import sarah from "./dialogs/sarah.json";
import ryuuko from "./dialogs/ryuuko.json";
import elena from "./dialogs/elena.json";
// every NPC's lines live in npcs/dialogs/<npc>.json (written by the
// /make-dialog skill). The same file is rendered to mp3s by python/dialog.py
// and turned into NPCProps here by toNPCProps, so a line is written once

type Line = [ja: string, en: string, audio?: string] // Line: **[ja, en]** -> **+ audio?**, reason: lines play recorded mp3s, mechanism: the file name (no .mp3) in the NPC's public/dialog/<voice>/ folder; left out = silent
// say() / ask() / npc(): **here** -> **removed**, mechanism: toDialogs / toNPCProps (toNPCProps.ts) build the same Dialog and NPCProps from the json; Line stays for QUEST_LINE

//npcs in island 1
export const ISLAND_1_NPC: NPCProps[] = [jordi, shuto, tiffany, genki, sarah].map(s => toNPCProps(s)) // list: **five hand-written npc(...) entries** -> **the five json files through toNPCProps**, mechanism: same name / voice / color / kana / Dialogs, in the same order (Jordi, Shuto, Tiffany, Genki, Sarah); x / y are 0 here because placeNpcs gives every island NPC its spot
// five NPCs around the spawn (world center 3500, 5000), each talking about
// a favorite food. Spots are fixed, not random, so server and client render
// the same places (no hydration mismatch), and all sit below y 5000, clear of
// the tower's hitBox (its sprite ends there) and 60+ px from the spawn so no
// one starts overlapping the player. Lines are short hiragana/katakana
// (≤ 15 characters where possible) so each fits one DialogBubble page for // limit: **≤ 12** -> **≤ 15**, mechanism: DialogBubble PAGE_CHARS is 15 now
// beginners; kanji is avoided since there's no furigana yet. Each NPC has a
// greeting (in range), a default talk (first time) and a shorter spoken
// talk (after that, this scene)
// lines and voices: each NPC's lines are in npcs/dialogs/<voice>.json, and
// its mp3s in public/dialog/<voice>/ (jordi, shuto, tiffany, genki, sarah). // lines: **[ja, en, file] items of say() in this file** -> **the json's kana / en / text**, mechanism: toDialogs makes the mp3 name from the kanji text with audioName (！ 、 〜 dropped, ？ kept)
// A line whose file is missing just fails to load and stays silent
// kana: each NPC owns one column of KANA_ROWS (Shuto あかさた, Jordi いきしち, // kana: **one vowel per NPC** -> **one column per NPC**, mechanism: ISLAND_1_NPC holds the あ-row kana; npcsForRow moves every NPC to the same column of a later row
// Tiffany うくすつ, Genki えけせて, Sarah おこそと); pickDialog skips the 'quest'
// talk once that NPC's current quest row is done

const QUEST_LINE: Record<string, (k: string) => Line> = {
    shuto: k => k === 'あ' ? ['さいしょのクエストだ！', "It's your first quest!", '最初のクエストだ'] : [`「${k}」のクエストだ！`, `It's the ${k} quest!`, `「${k}」のクエストだ`],
    jordi: k => [`「${k}」のクエストだよ！`, `It's the ${k} quest!`, `「${k}」のクエストだよ`],
    tiffany: k => [`「${k}」のクエストよ！`, `The ${k} quest!`, `「${k}」のクエストよ`],
    genki: k => [`「${k}」のクエストだ！`, `The ${k} quest!`, `「${k}」のクエストだ`],
    sarah: k => [`「${k}」のクエストだよ`, `This is the ${k} quest`, `「${k}」のクエストだよ`],
}
// the first line of each NPC's quest offer, built from the kana so one
// template covers every row. The file name is the line with ！ dropped, the
// same name python/dialogs/<voice>.yaml renders to. Shuto keeps his
// "first quest" line for あ

const list = (v?: string | string[]): string[] => v === undefined ? [] : Array.isArray(v) ? v : [v]
// a Dialog's jp / en / audio as an array (they may be a single string)

export const npcsForRow = (npcs: NPCProps[], row: number): NPCProps[] => npcs.map(n => {
    const col = KANA_ROWS[0].indexOf(n.kana ?? '')
    const kana = KANA_ROWS[row]?.[col]
    const line = n.voice ? QUEST_LINE[n.voice] : undefined
    if (!kana || !line) return n
    const [ja, en, audio] = line(kana)
    return {
        ...n, kana,
        dialog: n.dialog?.map(d => d.condition === 'quest'
            ? { ...d, jp: [ja, ...list(d.jp).slice(1)], en: [en, ...list(d.en).slice(1)], audio: [audio ?? '', ...list(d.audio).slice(1)] }
            : d),
    }
})
// moves the island's NPCs to kana row `row`: each NPC's あ-row kana gives
// its column, the kana becomes that column of the new row, and the quest
// offer's first line is swapped for QUEST_LINE (the second line, e.g.
// 準備はいい？, stays). NPCs without a kana or a template are passed as-is

//npcs on the Quest Island
const phaseCondition = (phase: TrainingPhase, failedLevel: number): Condition => {
    switch (phase) {
        case 'intro': return 'quest'
        case 'play1': return 'level1-start'
        case 'levelUp':
        case 'break': return 'level1-clear'
        case 'play2': return 'level2-start'
        case 'success': return 'level2-clear'
        case 'fail': return `level${failedLevel + 1}-fail`
        case 'again': return 'retry'
    }
}
// the dialog condition of a training phase, i.e. which entry of ryuuko.json
// / elena.json is said: before the quest, while a level runs, after it is
// cleared or failed, and the replay offer. 'break' (いいえ to the level-up
// offer) keeps level 1's clear entry, so Ryuuko repeats her offer and Elena
// says her own level1-clear lines. failedLevel is 0-based (the hooks'
// state), the label counts from 1

export const questIslandNpcs = (w: number, h: number, phase: TrainingPhase, target?: string, failedLevel = 0): NPCProps[] => { // args: **(w, h, phase, target?)** -> **+ failedLevel = 0**, mechanism: picks level1-fail or level2-fail in phase 'fail'; the three training hooks return it
    const { x: cx, y } = throwSpot(w, h) // spot: **(w / 2, h / 2 - 80)** -> **throwSpot(w, h)**, reason: Ryuuko stands at the top middle, mechanism: the same spot training.ts throws from, so blocks leave her hands
    const withElena = phase === 'success' || phase === 'fail' || phase === 'again' || phase === 'break' // elena: **success / fail** -> **+ again**, mechanism: she stays so the player can still leave while Ryuuko offers a replay // elena: **success / fail / again** -> **+ break**, mechanism: she comes out after いいえ to Ryuuko's level-up offer, standing 60px right of her like success
    const ryuukoX = phase === 'fail' ? cx + 40 : cx
    const ryuukoY = phase === 'play1' || phase === 'play2' ? playSpot(w, h).y : y // y: **y** -> **playSpot while playing**, mechanism: she drops 40px during a level so her target bubble clears the timer bar
    const elenaX = phase === 'fail' ? cx - 40 : cx + 60
    const condition = phaseCondition(phase, failedLevel)
    return [
        toNPCProps(ryuuko, ryuukoX, ryuukoY, sceneDialog(ryuuko, condition, target)), // npc: **npc(..., ryuukoDialog(phase, target))** -> **toNPCProps(ryuuko, x, y, sceneDialog(...))**, mechanism: name / voice / color come from ryuuko.json and the lines are the json entry of this phase's condition // // dialog: **ryuukoDialog(phase)** -> **+ target**, mechanism: forwards the target kana
        ...(withElena ? [toNPCProps(elena, elenaX, y, sceneDialog(elena, condition))] : []), // npc: **npc(..., elenaDialog(phase))** -> **toNPCProps(elena, x, y, sceneDialog(...))**, mechanism: same as Ryuuko, from elena.json // // voice: **undefined** -> **'elena'**, mechanism: lines load from public/dialog/elena/
    ]
}
// the Quest Island cast for one training phase, on an island sized at
// runtime (w = innerWidth*2, h = innerHeight*2). Indices are stable because
// the scene's onChoice gets the npc index: 0 = Ryuuko (always), 1 = Elena
// (only in success / fail / again / break). Everyone stands at throwSpot (middle, a quarter
// down), the player spawns three quarters down: Ryuuko at
// center, or 40 px right in fail with Elena 40 px left; in success Elena
// stands 60 px right of Ryuuko. Choices: Ryuuko はい starts / retries a
// level, Elena はい leaves the quest island, いいえ ends the talk
