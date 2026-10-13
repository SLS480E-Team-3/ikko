export type Verb = { verb: string, romaji: string, en: string, pair?: string }

export const VERBS: Verb[] = [
    { verb: '食べる', romaji: 'taberu', en: 'to eat', pair: '飲む' },
    { verb: '飲む', romaji: 'nomu', en: 'to drink', pair: '食べる' },
    { verb: '行く', romaji: 'iku', en: 'to go', pair: '来る' },
    { verb: '来る', romaji: 'kuru', en: 'to come', pair: '行く' },
    { verb: '見る', romaji: 'miru', en: 'to see', pair: '聞く' },
    { verb: '聞く', romaji: 'kiku', en: 'to listen', pair: '見る' },
    { verb: '歩く', romaji: 'aruku', en: 'to walk', pair: '話す' },
    { verb: '話す', romaji: 'hanasu', en: 'to talk', pair: '歩く' },
    { verb: '読む', romaji: 'yomu', en: 'to read', pair: '書く' },
    { verb: '書く', romaji: 'kaku', en: 'to write', pair: '読む' },
    { verb: '寝る', romaji: 'neru', en: 'to sleep', pair: '起きる' },
    { verb: '起きる', romaji: 'okiru', en: 'to wake up', pair: '寝る' },
    { verb: '買う', romaji: 'kau', en: 'to buy' },
    { verb: '待つ', romaji: 'matsu', en: 'to wait' },
]
// the Left or Right quest's word pool (docs/left-or-right.spec.json): Island
// 1 lesson 10's easy verbs plus a few more. pair is the verb whose meaning is
// the close decoy (eat/drink, go/come, see/listen, walk/talk, read/write,
// sleep/wake up); 買う and 待つ have none, so they only get far decoys. Each
// verb's clip is public/dialog/ryuuko/<verb>.mp3 (python/dialogs/ryuuko_verbs.yaml)

export const LR_QUESTIONS = 10
export const LR_CLOSE_FROM = 5
// a run is 10 questions; from index 5 on (question 6-10) the decoy is close

export type Side = 'left' | 'right'
export type Question = { verb: string, romaji: string, answer: string, decoy: string, correctSide: Side }

const shuffle = <T,>(a: T[]): T[] => {
    const b = [...a]
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]]
    }
    return b
}
// Fisher-Yates on a copy, so VERBS keeps its order

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]

export const buildRun = (): Question[] => {
    const paired = shuffle(VERBS.filter(v => v.pair))
    const close = paired.slice(0, LR_QUESTIONS - LR_CLOSE_FROM)
    const far = shuffle([...VERBS.filter(v => !v.pair), ...paired.slice(close.length)].slice(0, LR_CLOSE_FROM))
    const question = (v: Verb, closeDecoy: boolean): Question => ({
        verb: v.verb,
        romaji: v.romaji,
        answer: v.en,
        decoy: closeDecoy
            ? VERBS.find(o => o.verb === v.pair)!.en
            : pick(VERBS.filter(o => o.verb !== v.verb && o.verb !== v.pair)).en,
        correctSide: Math.random() < 0.5 ? 'left' : 'right',
    })
    return [...far.map(v => question(v, false)), ...close.map(v => question(v, true))]
}
// one run of 10 questions. 5 of the 12 paired verbs go to questions 6-10 with
// their partner's meaning as the decoy; 買う and 待つ plus 3 of the other
// paired verbs go to questions 1-5 in a shuffled order with a far decoy (any
// meaning but its own or its partner's). No verb shows twice in a run, and
// the correct door is left or right at random per question
