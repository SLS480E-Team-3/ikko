import { NPCProps } from "../Entity/npcRenderer";
import { Dialog } from "../Entity/dialogBubble";
import { ENT_H, ENT_W } from "../Entity/entityRenderer";
import { LEVELS, playSpot, throwSpot, type QuestsLevel, type TrainingPhase } from "../Scene/training"; // import: **{ QUEST_H, QUEST_W } from gameScene** -> **type TrainingPhase from training**, mechanism: the quest island is sized at runtime (w, h passed in), and its cast depends on the training phase // import: **type TrainingPhase** -> **+ throwSpot**, mechanism: Ryuuko stands where the blocks are thrown from // import: **+ throwSpot** -> **+ LEVELS, QuestsLevel**, mechanism: Ryuuko's 'again' choices are built from the training levels

type Line = [ja: string, en: string, audio?: string] // Line: **[ja, en]** -> **+ audio?**, reason: lines play recorded mp3s, mechanism: the file name (no .mp3) in the NPC's public/dialog/<voice>/ folder; left out = silent

const say = (condition: Dialog['condition'], ...lines: Line[]): Dialog => ({ condition, jp: lines.map(l => l[0]), en: lines.map(l => l[1]), audio: lines.map(l => l[2] ?? '') }) // say: **jp, en** -> **+ audio**, mechanism: collected index-aligned like en; a line with no file becomes '' (falsy, so NPCRenderer keeps it silent)
// one Dialog from [ja, en] pairs, so a translation can't drift off its line

const ask = (condition: Dialog['condition'], choices: [ja: string, en: string][], ...lines: Line[]): Dialog => ({ ...say(condition, ...lines), choices: choices.map(([jp, en]) => ({ jp, en })) })
// say() plus answer buttons under the last line. For 'quest', choice 0
// accepts (GameScene opens the quest) and any other choice declines (ends
// the talk)

const npc = (name: string, voice: string | undefined, x: number, y: number, color: string, dialog: Dialog[], kana?: string): NPCProps => ({ // args: **no kana** -> **+ kana?**, mechanism: the kana this NPC's quest trains; IslandScene matches it to a quest row, MobileTester passes it to QuestIsland // args: **(name, x, ...)** -> **(name, voice, x, ...)**, mechanism: voice is passed through; voice: **speech voice** -> **mp3 folder under public/dialog/ or undefined (silent)**
    voice,
    ent: { name, x, y, w: ENT_W, h: ENT_H, color, facing: 'none' },
    kana,
    dialog, // args: **greeting: Line, dialog: Line[]** -> **dialog: Dialog[]**, reason: NPC data is Dialog[] now, mechanism: passed straight through; the entries are built with say()
})
// builds one island NPC: every NPC shares the default body size and stands
// still (facing none), so only name / spot / color / lines differ per entry

//npcs in island 1
export const ISLAND_1_NPC: NPCProps[] = [
    npc('Jordi', 'jordi', 3420, 5070, 'plum', [ // voice: **'Aoi'** -> **'jordi'**, mechanism: NPCRenderer plays /dialog/<voice>/<file>.mp3, so Jordi now reads from the Gemini voice folder public/dialog/jordi/ (written by python/voice.py and dialog.py)
        say('greeting', ['こんにちは！', 'Hello!', 'こんにちは']),
        say('default',
            ['わたしはおすしがだいすき！', 'I love sushi!', '私はお寿司が大好き'], // file: **'私はお寿司が大好き！'** -> **'私はお寿司が大好き'**, mechanism: dialog.py drops ！ from file names, so the rendered mp3 has no ！
            ['とくにサーモンがすき！', 'Salmon is my favorite', 'とくにサーモンがすき'],
            ['あなたもおすしすき？', 'Are you also a sushi muncher?', 'あなたもお寿司好き？']), // file: **'あなたもすしずき？'** -> **'あなたもお寿司好き？'**, mechanism: matches the new line おすしすき, which python/dialogs/jordi.yaml renders to this name
        ask('quest', [['はい', 'Yes'], ['いいえ', 'No']],
            ['「い」のクエストだよ！', "It's the い quest!", '「い」のクエストだよ'],
            ['じゅんびはいい？', 'Ready?', '準備はいい？']),
        // Jordi's い quest: offered while the い quest row isn't done
        say('spoken', ['またおすしのはなししよ！', "Let's talk sushi again", 'またお寿司の話しよ']), // file: **'またすしのはなししよ'** -> **'またお寿司の話しよ'**, mechanism: matches the new line おすしのはなし, rendered by python/dialogs/jordi.yaml
    ], 'い'),
    npc('Shuto', 'shuto', 3590, 5060, 'steelblue', [
        say('greeting', ['やあ', 'Hey', 'やあ']),
        say('default',
            ['おれはラーメンがすきやで', 'I really love ramen', '俺はラーメンが好きやで'], // file: **'ラーメンが大好きだ'** -> **'俺はラーメンが好きやで'**, mechanism: the kanji form of the new Kansai line, rendered by python/dialogs/shuto.yaml
            ['いちばんはとんこつやな', 'Tonkotsu ramen is the best', '一番は豚骨やな'], // file: **'豚骨ラーメンが一番'** -> **'一番は豚骨やな'**, mechanism: same, kanji form of the new line
            ['いっしょにたべいこうぜ！', "Let's eat together!", '一緒に食べ行こうぜ']), // file: **'一緒に食べよう'** -> **'一緒に食べ行こうぜ'**, mechanism: kanji form with ！ dropped, as dialog.py names the mp3
        ask('quest', [['はい', 'Yes'], ['いいえ', 'No']],
            ['さいしょのクエストだ！', "It's your first quest!", '最初のクエストだ'],
            ['じゅんびはできてるか？', 'Are you ready?', '準備はできてるか？']), // quest: **say() with [['はい'],['いいえ']] as a line** -> **ask() with [ja, en] choices**, mechanism: choices ride on the Dialog instead of being read as a third line; mp3s stay silent until rendered
        say('spoken', ['はらへったなあ', "I'm getting hungry", '腹減ったなあ']), // file: **'お腹空いたなあ'** -> **'腹減ったなあ'**, mechanism: kanji form of はらへった (was お腹空いた)
    ], 'あ'),
    npc('Tiffany', 'tiffany', 3500, 5150, 'khaki', [
        say('greeting', ['おはよう！', 'Good morning!', 'おはよう']),
        say('default',
            ['わたしはあまいものがすき', 'I like sweet things', '私は甘い物が好き'], // file: **'甘い物が好き'** -> **'私は甘い物が好き'**, mechanism: kanji form of the new line わたしは…, rendered by python/dialogs/tiffany.yaml
            ['おもちがいちばんすき！', 'Mochi is my favorite!', 'お餅が一番好き'], // file: **'餅が一番好き'** -> **'お餅が一番好き'**, mechanism: kanji form of the new line おもち…, ！ dropped
            ['やわらかくておいしいよね！', "It's soft and tasty", '柔らかくて美味しいよね']), // file: **'柔らかくて美味しい'** -> **'柔らかくて美味しいよね'**, mechanism: kanji form of the new line …よね！, ！ dropped
        ask('quest', [['はい', 'Yes'], ['いいえ', 'No']],
            ['「う」のクエストよ！', 'The う quest!', '「う」のクエストよ'],
            ['じゅんびできた？', 'All set?', '準備できた？']),
        // Tiffany's う quest
        say('spoken', ['もち、たべたいな〜', 'I want some mochi', '餅食べたいな']),
    ], 'う'),
    npc('Genki', 'genki', 3300, 5110, 'gray', [
        say('greeting', ['よう！', 'Yo!', 'よう']),
        say('default',
            ['おれはカレーがすきだ', 'I like curry', '俺はカレーが好きだ'],
            ['からいカレーがいい', 'Spicy curry is good', '辛いカレーがいい'],
            ['やっぱまいにちたべたいよね！', 'I want it every day!', 'やっぱ毎日食べたいよね']), // file: **'毎日食べたい'** -> **'やっぱ毎日食べたいよね'**, mechanism: kanji form of the new line with ！ dropped, rendered by python/dialogs/genki.yaml
        ask('quest', [['はい', 'Yes'], ['いいえ', 'No']],
            ['「え」のクエストだ！', 'The え quest!', '「え」のクエストだ'],
            ['いけるか？', 'Can you do it?', 'いけるか？']),
        // Genki's え quest
        say('spoken', ['カレー、たべたか？', 'Did you eat curry?', 'カレー食べたか？']),
    ], 'え'),
    npc('Sarah', 'sarah', 3710, 5130, 'lightpink', [
        say('greeting', ['こんにちは〜', 'Hi there~', 'こんにちは']),
        say('default',
            ['わたしはおにぎりがすき', 'I like onigiri', '私はおにぎりが好き'],
            ['うめぼしがすっぱい！', 'Umeboshi is sour!', '梅干しが酸っぱい'],
            ['でも、おいしいよ', "But it's delicious", 'でも美味しいよ']),
        ask('quest', [['はい', 'Yes'], ['いいえ', 'No']],
            ['「お」のクエストだよ', 'This is the お quest', '「お」のクエストだよ'],
            ['がんばってね！', 'Good luck!', '頑張ってね']),
        // Sarah's お quest
        say('spoken', ['またね〜', 'See you~', 'またね']),
    ], 'お'),
]
// five NPCs around the spawn (world center 3500, 5000), each talking about
// a favorite food. Spots are fixed, not random, so server and client render
// the same places (no hydration mismatch), and all sit below y 5000, clear of
// the tower's hitBox (its sprite ends there) and 60+ px from the spawn so no
// one starts overlapping the player. Lines are short hiragana/katakana
// (≤ 15 characters where possible) so each fits one DialogBubble page for // limit: **≤ 12** -> **≤ 15**, mechanism: DialogBubble PAGE_CHARS is 15 now
// beginners; kanji is avoided since there's no furigana yet. Each NPC has a
// greeting (in range), a default talk (first time) and a shorter spoken
// talk (after that, this scene); lines are [Japanese, English] pairs
// voices (mp3 folders in public/dialog/): Jordi = jordi (Gemini voice; lines
// not rendered yet stay silent), Shuto = shuto (Gemini voice), Tiffany = tiffany; // Tiffany: **Shiori** -> **tiffany**, mechanism: matches npc('Tiffany', 'tiffany', ...); Shuto: **Keita** -> **shuto**, mechanism: matches npc('Shuto', 'shuto', ...)
// Genki = genki, Sarah = sarah (Gemini voices; silent until rendered). A third item // Sarah: **no folder** -> **sarah**, mechanism: matches npc('Sarah', 'sarah', ...); Genki: **no folder** -> **genki**, mechanism: matches npc('Genki', 'genki', ...) and public/dialog/genki/
// in a say() pair is the recording's file name (no .mp3): the line in kanji
// with ！ 、 〜 dropped and ？ kept. A line whose file is missing just fails
// to load and stays silent
// kana: each NPC's quest trains one vowel (Shuto あ, Jordi い, Tiffany う,
// Genki え, Sarah お); pickDialog skips the 'quest' talk once that row is done

//npcs on the Quest Island
const YES_NO: [ja: string, en: string][] = [['はい', 'Yes'], ['いいえ', 'No']]
// the shared はい / いいえ answers for every quest-island offer
const LEVEL = (levels: QuestsLevel[]): [ja: string, en: string][] => levels.map((_, i) => [`レベル${i + 1}`, `Level ${i + 1}`])
// selection for which levels to start from
// one [ja, en] choice per entry of LEVELS, numbered from 1; the choice index
// is the level index, which training.ts onChoice passes to startLevel

const ryuukoDialog = (phase: TrainingPhase): Dialog[] => {
    switch (phase) {
        case 'intro': return [
            say('greeting', ['じゅんびはできてる？', 'Ready?', '準備はできてる？']),
            ask('quest', YES_NO, ['じゅんびはできてる？', 'Ready?', '準備はできてる？'], ['いくわよ！', 'Here I go!', 'いくわよ'])]
        case 'levelUp':
        case 'break': return [ // case: **levelUp** -> **+ break**, mechanism: after いいえ Ryuuko repeats the same level-up offer, so はい still starts level 2
            say('greeting', ['よゆうそうね。', 'Looks easy for you.', '余裕そうね']),
            ask('quest', YES_NO, ['よゆうそうね。', 'Looks easy for you.', '余裕そうね'], ['ちょっと早くするわよ', 'Let me speed it up', 'ちょっと早くするわよ'])]
        case 'fail': return [
            say('greeting', ['まだまだいけるでしょ？', 'You can keep going, right?', 'まだまだいけるでしょ？']),
            ask('quest', YES_NO, ['まだまだいけるでしょ？', 'You can keep going, right?', 'まだまだいけるでしょ？'])]
        case 'success': return [
            say('greeting', ['おつかれさま！', 'Good job!', 'お疲れ様']), // audio: **おつかれさま！** -> **お疲れ様**, mechanism: kanji with ！ dropped, the file ryuuko_quest.yaml renders
            say('default', ['おつかれさま！', 'Good job!', 'お疲れ様'])]
        case 'again': return [
            say('greeting', ['まだまだいけるでしょ？', 'You can keep going, right?', 'まだまだいけるでしょ？']),
            ask('quest', LEVEL(LEVELS), ['どこから始める？', 'Where are we starting?', 'どこから始める？'])] // choices: **YES_NO** -> **LEVEL(LEVELS)**, mechanism: レベル1 / レベル2 buttons, the picked index is the level training.ts starts
        default: return [say('greeting', ['いくわよ！', 'Here I go!', 'いくわよ'])]
    }
}
// Ryuuko's lines per training phase. intro / levelUp / fail carry a 'quest'
// offer (it wins in pickDialog, since the quest island always has one open)
// whose はい starts or retries a level; play1 / play2 / success have only a
// greeting, which pickDialog falls back to, so a talk just repeats it

const elenaDialog = (phase: TrainingPhase): Dialog[] => phase === 'break'
    ? [say('greeting', ['しまにもどる？', 'Go back to the island?', '島に戻る？']), // audio: **none** -> **島に戻る？**, mechanism: plays public/dialog/elena/島に戻る？.mp3 from elena.yaml
    ask('quest', YES_NO, ['しまにもどる？', 'Go back to the island?', '島に戻る？'])]
    // break: only the go-back offer, no おめでとう since the training isn't done
    : phase === 'fail'
    ? [say('greeting', ['あきらめますか？', 'Give up?', '諦めますか？']),
    ask('quest', YES_NO, ['あきらめますか？', 'Give up?', '諦めますか？'])]
    : [say('greeting', ['おかえり？', 'Heading back?', 'お帰り？']), // audio: **none** -> **お帰り？ / 島に戻る？**, mechanism: file names match elena.yaml's rendered mp3s
    say('default', ['おめでとう！', 'GOOD JOB!', 'おめでとう']),
    ask('quest', YES_NO, ['しまにもどる？', 'Go back to the island?', '島に戻る？'])]
// Elena's lines: 'fail' asks whether to give up, 'success' whether to head
// back; both はい leave the quest island. Audio names match python/dialogs/elena.yaml

export const questIslandNpcs = (w: number, h: number, phase: TrainingPhase): NPCProps[] => {
    const { x: cx, y } = throwSpot(w, h) // spot: **(w / 2, h / 2 - 80)** -> **throwSpot(w, h)**, reason: Ryuuko stands at the top middle, mechanism: the same spot training.ts throws from, so blocks leave her hands
    const withElena = phase === 'success' || phase === 'fail' || phase === 'again' || phase === 'break' // elena: **success / fail** -> **+ again**, mechanism: she stays so the player can still leave while Ryuuko offers a replay // elena: **success / fail / again** -> **+ break**, mechanism: she comes out after いいえ to Ryuuko's level-up offer, standing 60px right of her like success
    const ryuukoX = phase === 'fail' ? cx + 40 : cx
    const ryuukoY = phase === 'play1' || phase === 'play2' ? playSpot(w, h).y : y // y: **y** -> **playSpot while playing**, mechanism: she drops 40px during a level so her target bubble clears the timer bar
    const elenaX = phase === 'fail' ? cx - 40 : cx + 60
    return [
        npc('Ryuuko', 'ryuuko', ryuukoX, ryuukoY, 'crimson', ryuukoDialog(phase)),
        ...(withElena ? [npc('Elena', 'elena', elenaX, y, 'seagreen', elenaDialog(phase))] : []), // voice: **undefined** -> **'elena'**, mechanism: lines load from public/dialog/elena/
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
