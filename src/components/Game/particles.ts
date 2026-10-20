export type Particle = 'に' | 'で'
export type Sentence = { before: string, after: string, answer: Particle, en: string }
// one sign sentence: the hiragana before the blank, the hiragana after it,
// the particle that fills the blank, and the English shown under it.
// before + answer + after is the full sentence Ryuuko reads on a right
// catch (its mp3 is audioName() of that text, python/dialogs/ryuuko_particles.yaml)

// ---------------------------------------------------------------------------
// EDIT HERE: the user edits and adds sentences in the two lists below.
// - hiragana only (no kanji, no romaji; D-7 in docs/island-3.spec.json)
// - keep each one unambiguous: only the given particle may fit the blank
// - a new sentence needs its line in python/dialogs/ryuuko_particles.yaml
//   (text = the full sentence) and a `dialog.py render` for its mp3
// ---------------------------------------------------------------------------

export const NI_SENTENCES: Sentence[] = [
    { before: 'いえ', after: 'いる', answer: 'に', en: 'I am at home.' },
    { before: 'がっこう', after: 'いく', answer: 'に', en: 'I go to school.' },
    { before: 'こうえん', after: 'いく', answer: 'に', en: 'I go to the park.' },
    { before: 'みせ', after: 'いく', answer: 'に', en: 'I go to the store.' },
    { before: 'いえ', after: 'かえる', answer: 'に', en: 'I go back home.' },
    { before: 'えき', after: 'つく', answer: 'に', en: 'I arrive at the station.' },
    { before: 'ふね', after: 'のる', answer: 'に', en: 'I get on the boat.' },
    { before: 'しちじ', after: 'おきる', answer: 'に', en: 'I wake up at seven.' },
    { before: 'くじ', after: 'ねる', answer: 'に', en: 'I go to bed at nine.' },
    { before: 'かわ', after: 'さかながいる', answer: 'に', en: 'There are fish in the river.' },
    { before: 'き', after: 'とりがいる', answer: 'に', en: 'There is a bird in the tree.' },
    { before: 'いえ', after: 'ねこがいる', answer: 'に', en: 'There is a cat in the house.' },
]
// に: place of existence (いる / ある), destination (いく / かえる / つく /
// のる) and time (しちじ / くじ)

export const DE_SENTENCES: Sentence[] = [
    { before: 'こうえん', after: 'あそぶ', answer: 'で', en: 'I play in the park.' },
    { before: 'こうえん', after: 'はしる', answer: 'で', en: 'I run in the park.' },
    { before: 'がっこう', after: 'べんきょうする', answer: 'で', en: 'I study at school.' },
    { before: 'いえ', after: 'たべる', answer: 'で', en: 'I eat at home.' },
    { before: 'いえ', after: 'ほんをよむ', answer: 'で', en: 'I read a book at home.' },
    { before: 'みせ', after: 'かう', answer: 'で', en: 'I buy it at the store.' },
    { before: 'えき', after: 'まつ', answer: 'で', en: 'I wait at the station.' },
    { before: 'かわ', after: 'およぐ', answer: 'で', en: 'I swim in the river.' },
    { before: 'ふね', after: 'いく', answer: 'で', en: 'I go by boat.' },
    { before: 'でんしゃ', after: 'いく', answer: 'で', en: 'I go by train.' },
    { before: 'えんぴつ', after: 'かく', answer: 'で', en: 'I write with a pencil.' },
    { before: 'はし', after: 'たべる', answer: 'で', en: 'I eat with chopsticks.' },
]
// で: place of an action (あそぶ / はしる / たべる / かう / まつ...) and
// means (ふね / でんしゃ / えんぴつ / はし = chopsticks)

export const DECOYS = ['を', 'へ']
// level 2's extra wood pieces; never the answer on island 3 (D-3)

export const fullSentence = (s: Sentence) => s.before + s.answer + s.after
// the whole sentence with the right particle: what Ryuuko reads and the
// text its mp3 is named from (audioName in npcs/toNPCProps.ts)

export const signText = (s: Sentence) => `${s.before}＿${s.after}`
// the sign's line: the blank is a full-width ＿

export const sentencesFor = (kana: string): Sentence[] =>
    kana === 'に' ? NI_SENTENCES : kana === 'で' ? DE_SENTENCES : [...NI_SENTENCES, ...DE_SENTENCES]
// the quest's pool: 'に' or 'で' alone, anything else ('mix') both lists

export const targetFor = (kana: string) => kana === 'に' || kana === 'で' ? kana : 'にとで'
// the {target} Ryuuko's quest line says: the particle, or にとで for the mix
// (its clip is public/dialog/ryuuko/にとで.mp3)

export const shuffle = <T,>(a: T[]): T[] => {
    const b = [...a]
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]]
    }
    return b
}
// Fisher-Yates on a copy (as in verbs.ts), so the lists keep their order
