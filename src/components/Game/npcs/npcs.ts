import { NPCProps } from "../Entity/npcRenderer";
import { ENT_H, ENT_W } from "../Entity/entityRenderer";

const npc = (name: string, x: number, y: number, color: string, greeting: string, dialog: string[]): NPCProps => ({
    ent: { name, x, y, w: ENT_W, h: ENT_H, color, facing: 'none' },
    greeting,
    dialog,
})
// builds one island NPC: every NPC shares the default body size and stands
// still (facing none), so only name / spot / color / lines differ per entry

//npcs in island 1
export const ISLAND_1_NPC: NPCProps[] = [
    npc('Hana', 3420, 5070, 'plum', 'こんにちは！', [
        'わたしはすしがすき！',
        'とくにサーモンがすき',
        'あなたもすし、すき？',
    ]),
    npc('Taro', 3590, 5060, 'steelblue', 'やあ！', [
        'ラーメンがだいすきだ',
        'みそラーメンがいちばん',
        'いっしょにたべよう！',
    ]),
    npc('Yuki', 3500, 5150, 'khaki', 'おはよう！', [
        'あまいものがすき',
        'もちがいちばんすき！',
        'やわらかくておいしい',
    ]),
    npc('Ken', 3300, 5110, 'gray', 'よう！', [
        'おれはカレーがすきだ',
        'からいカレーがいい',
        'まいにちたべたい！',
    ]),
    npc('Mei', 3710, 5130, 'lightpink', 'こんにちは〜', [
        'わたしはおにぎりがすき',
        'うめぼしがすっぱい！',
        'でも、おいしいよ',
    ]),
]
// five NPCs around the spawn (world center 3500, 5000), each talking about
// a favorite food. Spots are fixed, not random, so server and client render
// the same places (no hydration mismatch), and all sit below y 5000, clear of
// the tower's hitBox (its sprite ends there) and 60+ px from the spawn so no
// one starts overlapping the player. Lines are short hiragana/katakana
// (≤ 12 characters where possible) so each fits one DialogBubble page for
// beginners; kanji is avoided since there's no furigana yet
