import { NPCProps } from "../Entity/npcRenderer";
import { Dialog } from "../Entity/dialogBubble";
import { ENT_H, ENT_W } from "../Entity/entityRenderer";

type Line = [ja: string, en: string]

const say = (condition: Dialog['condition'], ...lines: Line[]): Dialog => ({ condition, jp: lines.map(l => l[0]), en: lines.map(l => l[1]) })
// one Dialog from [ja, en] pairs, so a translation can't drift off its line

const npc = (name: string, x: number, y: number, color: string, dialog: Dialog[]): NPCProps => ({ // args: **greeting: Line, dialog: Line[]** -> **dialog: Dialog[]**, reason: NPC data is Dialog[] now, mechanism: passed straight through; the entries are built with say()
    ent: { name, x, y, w: ENT_W, h: ENT_H, color, facing: 'none' },
    dialog,
})
// builds one island NPC: every NPC shares the default body size and stands
// still (facing none), so only name / spot / color / lines differ per entry

//npcs in island 1
export const ISLAND_1_NPC: NPCProps[] = [
    npc('Jordi', 3420, 5070, 'plum', [
        say('greeting', ['こんにちは！', 'Hello!']),
        say('default',
            ['わたしはすしがすき！', 'I love sushi!'],
            ['とくにサーモンがすき', 'Salmon is my favorite'],
            ['あなたもすし、すき？', 'Do you like sushi too?']),
        say('spoken', ['また、すしのはなししよう', "Let's talk sushi again"]),
    ]),
    npc('Shuto', 3590, 5060, 'steelblue', [
        say('greeting', ['やあ！', 'Hey!']),
        say('default',
            ['ラーメンがだいすきだ', 'I really love ramen'],
            ['みそラーメンがいちばん', 'Miso ramen is the best'],
            ['いっしょにたべよう！', "Let's eat together!"]),
        say('spoken', ['おなかすいたなあ', "I'm getting hungry"]),
    ]),
    npc('Tiffany', 3500, 5150, 'khaki', [
        say('greeting', ['おはよう！', 'Good morning!']),
        say('default',
            ['あまいものがすき', 'I like sweet things'],
            ['もちがいちばんすき！', 'Mochi is my favorite!'],
            ['やわらかくておいしい', "It's soft and tasty"]),
        say('spoken', ['もち、たべたいな', 'I want some mochi']),
    ]),
    npc('Genki', 3300, 5110, 'gray', [
        say('greeting', ['よう！', 'Yo!']),
        say('default',
            ['おれはカレーがすきだ', 'I like curry'],
            ['からいカレーがいい', 'Spicy curry is good'],
            ['まいにちたべたい！', 'I want it every day!']),
        say('spoken', ['カレー、たべたか？', 'Did you eat curry?']),
    ]),
    npc('Sarah', 3710, 5130, 'lightpink', [
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
