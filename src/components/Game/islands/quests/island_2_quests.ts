import { QuestsProps } from "@/utils/schema";

// こんにちは
const QUEST_2_KONNICHIWA_KANA: QuestsProps = { // naming: **QUEST_{unit}_{WORD}_{KANA|WORD}**, mechanism: the romaji word says which word the quest teaches and KANA/WORD says what the player picks (type A/B), instead of three bare numbers/letters
    islandId: 2,
    title: 'Hiragana: こんにちは',
    type: 'A',
    rounds: [
        { prompt: 'こ', choices: [{ label: 'ko', reveal: 'こ' }, { label: 'ku', reveal: 'く' }, { label: 'ke', reveal: 'け' }, { label: 'go', reveal: 'ご' }], answer: 0 },
        { prompt: 'ん', choices: [{ label: 'ne', reveal: 'ね' }, { label: 'mu', reveal: 'む' }, { label: 'nu', reveal: 'ぬ' }, { label: 'n', reveal: 'ん' }], answer: 3 },
        { prompt: 'に', choices: [{ label: 'na', reveal: 'な' }, { label: 'ni', reveal: 'に' }, { label: 'nu', reveal: 'ぬ' }, { label: 'ne', reveal: 'ね' }], answer: 1 },
        { prompt: 'ち', choices: [{ label: 'sa', reveal: 'さ' }, { label: 'chi', reveal: 'ち' }, { label: 'ta', reveal: 'た' }, { label: 'tsu', reveal: 'つ' }], answer: 1 },
        { prompt: 'は', choices: [{ label: 'ho', reveal: 'ほ' }, { label: 'he', reveal: 'へ' }, { label: 'ha', reveal: 'は' }, { label: 'ba', reveal: 'ば' }], answer: 2 },
    ],
}

const QUEST_2_KONNICHIWA_WORD: QuestsProps = {
    islandId: 2,
    title: 'Word: こんにちは',
    type: 'B',
    rounds: [
        { prompt: 'こんにちは', choices: [{ label: 'good morning', reveal: 'おはよう' }, { label: 'hello', reveal: 'こんにちは' }, { label: 'good evening', reveal: 'こんばんは' }, { label: 'goodbye', reveal: 'さようなら' }], answer: 1 },
    ],
}

// ありがとう
const QUEST_2_ARIGATOU_KANA: QuestsProps = {
    islandId: 2,
    title: 'Hiragana: ありがとう',
    type: 'A',
    rounds: [
        { prompt: 'あ', choices: [{ label: 'a', reveal: 'あ' }, { label: 'o', reveal: 'お' }, { label: 'nu', reveal: 'ぬ' }, { label: 'me', reveal: 'め' }], answer: 0 },
        { prompt: 'り', choices: [{ label: 'ra', reveal: 'ら' }, { label: 'i', reveal: 'い' }, { label: 'ri', reveal: 'り' }, { label: 'ru', reveal: 'る' }], answer: 2 },
        { prompt: 'が', choices: [{ label: 'ka', reveal: 'か' }, { label: 'ga', reveal: 'が' }, { label: 'ki', reveal: 'き' }, { label: 'gi', reveal: 'ぎ' }], answer: 1 },
        { prompt: 'と', choices: [{ label: 'to', reveal: 'と' }, { label: 'do', reveal: 'ど' }, { label: 'te', reveal: 'て' }, { label: 'ko', reveal: 'こ' }], answer: 0 },
        { prompt: 'う', choices: [{ label: 'ra', reveal: 'ら' }, { label: 'tsu', reveal: 'つ' }, { label: 'fu', reveal: 'ふ' }, { label: 'u', reveal: 'う' }], answer: 3 },
    ],
}

const QUEST_2_ARIGATOU_WORD: QuestsProps = {
    islandId: 2,
    title: 'Word: ありがとう',
    type: 'B',
    rounds: [
        { prompt: 'ありがとう', choices: [{ label: 'thank you', reveal: 'ありがとう' }, { label: "you're welcome", reveal: 'どういたしまして' }, { label: 'good night', reveal: 'おやすみ' }, { label: 'please', reveal: 'おねがいします' }], answer: 0 },
    ],
}

// すみません
const QUEST_2_SUMIMASEN_KANA: QuestsProps = {
    islandId: 2,
    title: 'Hiragana: すみません',
    type: 'A',
    rounds: [
        { prompt: 'す', choices: [{ label: 'mu', reveal: 'む' }, { label: 'su', reveal: 'す' }, { label: 'o', reveal: 'お' }, { label: 'tsu', reveal: 'つ' }], answer: 1 },
        { prompt: 'み', choices: [{ label: 'me', reveal: 'め' }, { label: 'mu', reveal: 'む' }, { label: 'mi', reveal: 'み' }, { label: 'ni', reveal: 'に' }], answer: 2 },
        { prompt: 'ま', choices: [{ label: 'ha', reveal: 'は' }, { label: 'ho', reveal: 'ほ' }, { label: 'ke', reveal: 'け' }, { label: 'ma', reveal: 'ま' }], answer: 3 },
        { prompt: 'せ', choices: [{ label: 'se', reveal: 'せ' }, { label: 'sa', reveal: 'さ' }, { label: 'ze', reveal: 'ぜ' }, { label: 'ke', reveal: 'け' }], answer: 0 },
        { prompt: 'ん', choices: [{ label: 'so', reveal: 'そ' }, { label: 'n', reveal: 'ん' }, { label: 'ru', reveal: 'る' }, { label: 'nu', reveal: 'ぬ' }], answer: 1 },
    ],
}

const QUEST_2_SUMIMASEN_WORD: QuestsProps = {
    islandId: 2,
    title: 'Word: すみません',
    type: 'B',
    rounds: [
        { prompt: 'すみません', choices: [{ label: 'yes', reveal: 'はい' }, { label: 'no', reveal: 'いいえ' }, { label: 'please', reveal: 'おねがいします' }, { label: 'excuse me', reveal: 'すみません' }], answer: 3 },
    ],
}

// ごめんなさい
const QUEST_2_GOMENNASAI_KANA: QuestsProps = {
    islandId: 2,
    title: 'Hiragana: ごめんなさい',
    type: 'A',
    rounds: [
        { prompt: 'ご', choices: [{ label: 'gu', reveal: 'ぐ' }, { label: 'ko', reveal: 'こ' }, { label: 'ni', reveal: 'に' }, { label: 'go', reveal: 'ご' }], answer: 3 },
        { prompt: 'め', choices: [{ label: 'me', reveal: 'め' }, { label: 'nu', reveal: 'ぬ' }, { label: 'a', reveal: 'あ' }, { label: 'no', reveal: 'の' }], answer: 0 },
        { prompt: 'ん', choices: [{ label: 'mu', reveal: 'む' }, { label: 'so', reveal: 'そ' }, { label: 'n', reveal: 'ん' }, { label: 'ne', reveal: 'ね' }], answer: 2 },
        { prompt: 'な', choices: [{ label: 'ta', reveal: 'た' }, { label: 'na', reveal: 'な' }, { label: 'ha', reveal: 'は' }, { label: 'ma', reveal: 'ま' }], answer: 1 },
        { prompt: 'さ', choices: [{ label: 'ki', reveal: 'き' }, { label: 'chi', reveal: 'ち' }, { label: 'sa', reveal: 'さ' }, { label: 'za', reveal: 'ざ' }], answer: 2 },
        { prompt: 'い', choices: [{ label: 'ri', reveal: 'り' }, { label: 'ko', reveal: 'こ' }, { label: 'ha', reveal: 'は' }, { label: 'i', reveal: 'い' }], answer: 3 },
    ],
}

const QUEST_2_GOMENNASAI_WORD: QuestsProps = {
    islandId: 2,
    title: 'Word: ごめんなさい',
    type: 'B',
    rounds: [
        { prompt: 'ごめんなさい', choices: [{ label: 'good night', reveal: 'おやすみ' }, { label: 'nice to meet you', reveal: 'はじめまして' }, { label: "I'm sorry", reveal: 'ごめんなさい' }, { label: "you're welcome", reveal: 'どういたしまして' }], answer: 2 },
    ],
}

// さようなら
const QUEST_2_SAYOUNARA_KANA: QuestsProps = {
    islandId: 2,
    title: 'Hiragana: さようなら',
    type: 'A',
    rounds: [
        { prompt: 'さ', choices: [{ label: 'sa', reveal: 'さ' }, { label: 'chi', reveal: 'ち' }, { label: 'ki', reveal: 'き' }, { label: 'za', reveal: 'ざ' }], answer: 0 },
        { prompt: 'よ', choices: [{ label: 'ma', reveal: 'ま' }, { label: 'yo', reveal: 'よ' }, { label: 'ho', reveal: 'ほ' }, { label: 'yu', reveal: 'ゆ' }], answer: 1 },
        { prompt: 'う', choices: [{ label: 'ra', reveal: 'ら' }, { label: 'tsu', reveal: 'つ' }, { label: 'u', reveal: 'う' }, { label: 'fu', reveal: 'ふ' }], answer: 2 },
        { prompt: 'な', choices: [{ label: 'ta', reveal: 'た' }, { label: 'ha', reveal: 'は' }, { label: 'ma', reveal: 'ま' }, { label: 'na', reveal: 'な' }], answer: 3 },
        { prompt: 'ら', choices: [{ label: 'ra', reveal: 'ら' }, { label: 'u', reveal: 'う' }, { label: 'chi', reveal: 'ち' }, { label: 'ru', reveal: 'る' }], answer: 0 },
    ],
}

const QUEST_2_SAYOUNARA_WORD: QuestsProps = {
    islandId: 2,
    title: 'Word: さようなら',
    type: 'B',
    rounds: [
        { prompt: 'さようなら', choices: [{ label: 'hello', reveal: 'こんにちは' }, { label: 'good evening', reveal: 'こんばんは' }, { label: 'good morning', reveal: 'おはよう' }, { label: 'goodbye', reveal: 'さようなら' }], answer: 3 },
    ],
}

export const ISLAND_2_QUESTS: QuestsProps[] = [ // island: **1 (island_1_quests.ts, ISLAND_1_QUESTS, QUEST_1_*)** -> **2 (island_2_quests.ts, ISLAND_2_QUESTS, QUEST_2_*)**, mechanism: greetings/thanks/apologies moved to island 2 Vocabulary / Phrases in docs/curriculum.md, so every quest sets islandId: 2
    QUEST_2_KONNICHIWA_KANA, QUEST_2_KONNICHIWA_WORD,
    QUEST_2_ARIGATOU_KANA, QUEST_2_ARIGATOU_WORD,
    QUEST_2_SUMIMASEN_KANA, QUEST_2_SUMIMASEN_WORD,
    QUEST_2_GOMENNASAI_KANA, QUEST_2_GOMENNASAI_WORD,
    QUEST_2_SAYOUNARA_KANA, QUEST_2_SAYOUNARA_WORD,
]
// 2. Vocabulary / Phrases (greetings, thanks, apologies, すみません): 5 words, each taught
// by a KANA quest (type A: one round per distinct hiragana, pick the romaji)
// followed by a WORD quest (type B: one round, pick the English meaning).
// Kana distractors are look-alikes or same-row/column kana (こ vs く け ご)
// so the reveal step teaches the neighbours too; word distractors are other
// everyday phrases, avoiding meanings that overlap the answer (すみません's
// round leaves out "sorry"/"thank you", which it can also mean). The answer
// index moves around so position can't be guessed. は is asked as "ha",
// its character reading, not the particle "wa". questId and rewardPoints
// stay unset until the quests table and reward rules exist
