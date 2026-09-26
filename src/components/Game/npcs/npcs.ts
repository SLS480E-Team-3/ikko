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
    npc('Jordi', 'Aoi', 3420, 5070, 'plum', [
        say('greeting', ['こんにちは！', 'Hello!', 'こんにちは']),
        say('default',
            ['わたしはすしがすき！', 'I love sushi!', '私は寿司が好き'],
            ['とくにサーモンがすき', 'Salmon is my favorite', 'とくにサーモンがすき'],
            ['あなたもすしずき？', 'Are you also a sushi muncher?', 'あなたもすしずき？']),
        say('spoken', ['また、すしのはなししよ', "Let's talk sushi again", 'またすしのはなししよ']),
    ]),
    npc('Shuto', undefined, 3590, 5060, 'steelblue', [
        say('greeting', ['やあ！', 'Hey!']),
        say('default',
            ['ラーメンがだいすきだ', 'I really love ramen'],
            ['みそラーメンがいちばん', 'Miso ramen is the best'],
            ['いっしょにたべよう！', "Let's eat together!"]),
        say('spoken', ['おなかすいたなあ', "I'm getting hungry"]),
    ]),
    npc('Tiffany', 'Shiori', 3500, 5150, 'khaki', [
        say('greeting', ['おはよう！', 'Good morning!']),
        say('default',
            ['あまいものがすき', 'I like sweet things', '甘い物が好き'],
            ['もちがいちばんすき！', 'Mochi is my favorite!'],
            ['やわらかくておいしい', "It's soft and tasty"]),
        say('spoken', ['もち、たべたいな', 'I want some mochi']),
    ]),
    npc('Genki', undefined, 3300, 5110, 'gray', [
        say('greeting', ['よう！', 'Yo!']),
        say('default',
            ['おれはカレーがすきだ', 'I like curry'],
            ['からいカレーがいい', 'Spicy curry is good'],
            ['まいにちたべたい！', 'I want it every day!']),
        say('spoken', ['カレー、たべたか？', 'Did you eat curry?']),
    ]),
    npc('Sarah', undefined, 3710, 5130, 'lightpink', [
        say('greeting', ['こんにちは〜', 'Hi there~']),
        say('default',
            ['わたしはおにぎりがすき', 'I like onigiri'],
            ['うめぼしがすっぱい！', 'Umeboshi is sour!'],
            ['でも、おいしいよ', "But it's delicious"]),
        say('spoken', ['またね〜', 'See you~']),
    ]),
]
// five NPCs around the spawn (world center 3500, 5000), each talking about
// a favorite food. Spots are fixed, not random, so server and client render
// the same places (no hydration mismatch), and all sit below y 5000, clear of
// the tower's hitBox (its sprite ends there) and 60+ px from the spawn so no
// one starts overlapping the player. Lines are short hiragana/katakana
// (≤ 12 characters where possible) so each fits one DialogBubble page for
// beginners; kanji is avoided since there's no furigana yet. Each NPC has a
// greeting (in range), a default talk (first time) and a shorter spoken
// talk (after that, this scene); lines are [Japanese, English] pairs
// voices (mp3 folders in public/dialog/): Jordi = Aoi (all lines recorded),
// Tiffany = Shiori (only あまいものがすき so far); Shuto, Genki and Sarah
// have no recordings yet, so they're silent. A third item in a say() pair is
// the recording's file name, which may differ from the text (kanji, no 、)
