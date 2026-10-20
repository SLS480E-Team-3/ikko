---
name: make-dialog
description: Write or edit one NPC's dialog file (json), render its mp3s, and hook it into the game. Use when the user says "make dialog <npc>" or asks for new or changed NPC lines.
argument-hint: <npc> [notes]
---

# Make a dialog

Arguments: `$ARGUMENTS`. The first word is the NPC's voice name in lowercase (`jordi`). The rest is notes: where the NPC is (island 1-5 or the Quest Island), who they are, what they talk about.

One file holds everything an NPC says: `src/components/Game/npcs/dialogs/{npc}.json`. `dialog.py render` makes the mp3s from it and `toNPCProps()` makes the game's `NPCProps` from it. Never write lines in `npcs.ts` or in a yaml.

The players are absolute beginners in Japanese.

## 1. Voice
- `{npc}` must be in `python/voices.json` with a `voice_id`. If not, do "Creating New Voice" in `docs/dialogs-and-voice.md` first.

## 2. Plan the conditions
An island NPC needs:

| Condition | When it plays | Lines |
|---|---|---|
| `greeting` | player walks into range | 1 |
| `default` | first talk | 2-3 |
| `quest` | the quest offer, with choices はい / いいえ | 2 |
| `spoken` | every later talk | 1 |
| `questCleared` (optional) | after the NPC's quest is cleared | 1-2 |

A Quest Island NPC needs:

| Condition | When it plays |
|---|---|
| `quest` | before the quest: the offer to start, choices はい / いいえ |
| `level<N>-start` | level N is running (N from 1) |
| `level<N>-clear` | level N is cleared. With choices if the NPC offers the next level |
| `level<N>-fail` | level N failed. Choices はい / いいえ to try again |
| `retry` | after the last level: one choice per level |

Conditions that share the same lines go in one entry as a list: `"condition": ["level1-fail", "level2-fail"]`.

Show the planned conditions and lines in chat as a table (condition, kana, kanji, English, style) before writing the file.

## 3. Write the file
```json
{
  "npc": "jordi",
  "name": "Jordi",
  "color": "plum",
  "kana": "い",
  "dialog": [
    { "condition": "greeting",
      "lines": [{ "kana": "こんにちは！", "text": "こんにちは！", "en": "Hello!" }] },
    { "condition": "quest",
      "choices": [["はい", "Yes"], ["いいえ", "No"]],
      "lines": [
        { "kana": "「い」のクエストだよ！", "text": "「い」のクエストだよ！", "en": "It's the い quest!" },
        { "kana": "じゅんびはいい？", "text": "準備はいい？", "en": "Ready?", "style": "playful" }
      ] }
  ]
}
```

Line rules:
- `kana`: what the player reads. Hiragana and katakana only, 15 characters or fewer.
- `text`: the same line in kanji, for the TTS. The mp3 name comes from it, so two lines with the same `text` share one file.
- `en`: short, natural English.
- `style` (optional): the mood of this one line (`teasing, quiet`). Age, gender and accent belong in the voice profile.
- `{target}` in `kana` / `en` is replaced by the quest's kana. In `text`, write `{target}` where the kana is said: the words before and after it are rendered as their own clips and the kana plays from its existing clip (`public/dialog/{npc}/<kana>.mp3`). Keep each piece a phrase of 3 characters or more (`今回のお題は{target}`, not `…{target}よ`): a 1-2 character piece would replace a kana clip, and `dialog.py` stops on it. The NPC needs the kana clips; without them, leave `text` out and the line is silent.
- `kana` (top level): only for an island NPC that owns a quest kana.

## 4. Render
From `python/`, in a background sub-agent while the rest goes on:

```bash
python dialog.py render ../src/components/Game/npcs/dialogs/{npc}.json
```

It prints one `-> public/dialog/{npc}/<line>.mp3` per line. Lines already rendered are read from the cache.

## 5. Hook it in (new NPC only)
In `src/components/Game/npcs/npcs.ts`, import the json and add it to the list it belongs to (`ISLAND_1_NPC`, or the Quest Island cast).

## 6. Check
- `npx tsc --noEmit`.
- Every `-> ...mp3` printed in step 4 exists.
- Report: conditions written, mp3s made, mp3s reused. Do not commit.
