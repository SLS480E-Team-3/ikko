import { NPCProps } from "../Entity/npcRenderer";
import { Dialog } from "../Entity/dialogBubble";
import { ENT_H, ENT_W } from "../Entity/entityRenderer";

type Line = [ja: string, en: string, audio?: string] // Line: **[ja, en]** -> **+ audio?**, reason: lines play recorded mp3s, mechanism: the file name (no .mp3) in the NPC's public/dialog/<voice>/ folder; left out = silent

const say = (condition: Dialog['condition'], ...lines: Line[]): Dialog => ({ condition, jp: lines.map(l => l[0]), en: lines.map(l => l[1]), audio: lines.map(l => l[2] ?? '') }) // say: **jp, en** -> **+ audio**, mechanism: collected index-aligned like en; a line with no file becomes '' (falsy, so NPCRenderer keeps it silent)
// one Dialog from [ja, en] pairs, so a translation can't drift off its line

const npc = (name: string, voice: string | undefined, x: number, y: number, color: string, dialog: Dialog[]): NPCProps => ({ // args: **(name, x, ...)** -> **(name, voice, x, ...)**, mechanism: voice is passed through; voice: **speech voice** -> **mp3 folder under public/dialog/ or undefined (silent)**
    voice,
    ent: { name, x, y, w: ENT_W, h: ENT_H, color, facing: 'none' },
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
        say('spoken', ['またおすしのはなししよ！', "Let's talk sushi again", 'またお寿司の話しよ']), // file: **'またすしのはなししよ'** -> **'またお寿司の話しよ'**, mechanism: matches the new line おすしのはなし, rendered by python/dialogs/jordi.yaml
    ]),
    npc('Shuto', 'Keita', 3590, 5060, 'steelblue', [
        say('greeting', ['やあ！', 'Hey!', 'やあ']),
        say('default',
            ['ラーメンがだいすきだ', 'I really love ramen', 'ラーメンが大好きだ'],
            ['とんこつラーメンがいちばん', 'Tonkotsu ramen is the best', '豚骨ラーメンが一番'],
            ['いっしょにたべよう！', "Let's eat together!", '一緒に食べよう']),
        say('spoken', ['おなかすいたなあ', "I'm getting hungry", 'お腹空いたなあ']),
    ]),
    npc('Tiffany', 'Shiori', 3500, 5150, 'khaki', [
        say('greeting', ['おはよう！', 'Good morning!', 'おはよう']),
        say('default',
            ['あまいものがすき', 'I like sweet things', '甘い物が好き'],
            ['もちがいちばんすき！', 'Mochi is my favorite!', '餅が一番好き'],
            ['やわらかくておいしい', "It's soft and tasty", '柔らかくて美味しい']),
        say('spoken', ['もち、たべたいな', 'I want some mochi', '餅食べたいな']),
    ]),
    npc('Genki', undefined, 3300, 5110, 'gray', [
        say('greeting', ['よう！', 'Yo!', 'よう']),
        say('default',
            ['おれはカレーがすきだ', 'I like curry', '俺はカレーが好きだ'],
            ['からいカレーがいい', 'Spicy curry is good', '辛いカレーがいい'],
            ['まいにちたべたい！', 'I want it every day!', '毎日食べたい']),
        say('spoken', ['カレー、たべたか？', 'Did you eat curry?', 'カレー食べたか？']),
    ]),
    npc('Sarah', undefined, 3710, 5130, 'lightpink', [
        say('greeting', ['こんにちは〜', 'Hi there~', 'こんにちは']),
        say('default',
            ['わたしはおにぎりがすき', 'I like onigiri', '私はおにぎりが好き'],
            ['うめぼしがすっぱい！', 'Umeboshi is sour!', '梅干しが酸っぱい'],
            ['でも、おいしいよ', "But it's delicious", 'でも美味しいよ']),
        say('spoken', ['またね〜', 'See you~', 'またね']),
    ]),
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
// not rendered yet stay silent), Shuto = Keita, Tiffany = Shiori;
// Genki and Sarah have no folder yet, so they're silent. A third item
// in a say() pair is the recording's file name (no .mp3): the line in kanji
// with ！ 、 〜 dropped and ？ kept. A line whose file is missing just fails
// to load and stays silent
