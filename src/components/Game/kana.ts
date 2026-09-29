export const KANA_ROWS: string[][] = [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
]
// the gojūon rows island 1 walks through, in order. A kana's column (0..4) is
// its vowel, which is how each NPC keeps "its" column across rows

export const rowOf = (kana: string): string[] => KANA_ROWS.find(r => r.includes(kana)) ?? KANA_ROWS[0]
// the whole row a kana belongs to (falls back to あ–お for an unknown kana);
// training mixes this row into level 2

export const KANA_ROMAJI: Record<string, string> = {
    あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
    か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
    さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
    た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
}
// Hepburn romaji for every kana in KANA_ROWS (し shi, ち chi, つ tsu are the
// irregular ones), for beginners who can't read the kana yet
