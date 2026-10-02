# Dialogs

saved in /public/dialog/`<character>`

## Creating New Voice

### 1. Add a profile

Add an entry to `python/voices.json` with all 15 profile fields (see the Voice profile table in `python/README.md`). Leave `description`, `voice_id`, `model` and `created` out; `create` fills them.

```json
{
    "name": "jordi",
    "profile": {
    　"language": "Japanese",
    　"accent": "Tokyo standard",
    　"gender": "female",
    　"age": "20",
    　"personality": "energetic, friendly, a bit playful",
    　"timbre": "bright and slightly airy",
    　"energy": "high and cheerful",
    　"pitch": "slightly high",
    　"pitch_range": "wide with rising endings",
    　"speed": "slightly fast",
    　"volume": "medium-loud",
    　"articulation": "clear but relaxed",
    　"register": "casual, with light desu/masu when polite",
    　"pauses": "short",
    　"use_case": "game character"
    }
}
```

- `name` is lowercase. It becomes the `voice` in `npc()`, the `speaker` in the yaml and the folder in `public/dialog/`.
- Keep the fields consistent with each other (e.g. a `calm` personality with `low` energy).

### 2. Create it

```bash
python voice.py create tiffany --from voices.json
```

- Designs the voice and saves its `voice_id` to `voices.json`.
- Renders a self-introduction to `public/dialog/<name>/_sample.mp3`. Listen to it; if it's off, edit the profile and run `create` again (it replaces the `voice_id`).
- Leave out `--from voices.json` to type the fields in one by one instead.

```bash
python voice.py list
```

shows every voice and whether it has been created.

### What decides the voice

The profile in `voices.json` is the only per-voice input you control. `create` sends ([`design_voice`](../python/gemini_tts.py)):

| Sent | Comes from |
|---|---|
| `prompted.input` (the main prompt) | all 15 profile fields, filled into the fixed sentence template in `build_description` |
| `gender` | profile `gender`, also sent as its own field |
| `language_code` | profile `language`, turned into a code such as `ja-JP` |
| `model` | the `--model` flag, default `gemini-3.8-flash-tts` |
| `display_name` | the name passed to `create` |

Outside `voices.json`:

- **Template wording.** Changing `build_description` changes the prompt for every voice created after that.
- **Randomness.** No seed is sent, so creating the same profile twice probably gives two slightly different voices. Re-creating a voice you like is a gamble.
- **`description` isn't an input.** `create` rebuilds it from the profile and overwrites it, so editing it by hand does nothing.

After creation:

- The voice is fixed to its `voice_id`. Editing the profile does nothing until you run `create` again.
- A line's `style` in the yaml changes that one line's delivery (mood), not the voice itself.
- The `_sample.mp3` text is written by a text model from the profile. It changes what the sample says, not how the voice sounds.

### 3. Use it

Write the NPC's lines with `/make-dialog <name>` → [Scripting](#scripting), then [Speech Generation](#speech-generation).

### Limits

- 200 custom voices per Google Cloud project.
- A voice expires 1 year after `created`.

## Scripting

One file per NPC: `src/components/Game/npcs/dialogs/<npc>.json`. The `/make-dialog <npc>` skill writes it. The same file gives:

- the mp3s, by `python dialog.py render` → [Speech Generation](#speech-generation)
- the game's `NPCProps`, by `toNPCProps()` in `src/components/Game/npcs/toNPCProps.ts`

Lines are not written in `npcs.ts`.

### The file

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

| Field | What it is |
|---|---|
| `npc` | The voice's `name` in `python/voices.json`, the folder under `public/dialog/`, and `NPCProps.voice` |
| `name` | Name shown above the NPC |
| `color` | Body color |
| `kana` (optional) | The kana an island NPC's quest trains |
| `dialog[].condition` | One label, or a list of labels that share the same lines |
| `dialog[].choices` (optional) | `[kana, english]` answer buttons under the last line |
| `lines[].kana` | Shown on screen. Hiragana/katakana (no furigana yet), 15 characters or fewer, so it fits one bubble page |
| `lines[].text` | The same line in kanji (the TTS reads kanji more accurately). The mp3 name comes from it. Left out = the line is silent |
| `lines[].en` | English typed under the line |
| `lines[].style` (optional) | The mood of this one line for the TTS, e.g. `teasing, quiet`. Age, gender and accent belong in the voice profile |

- There is no x / y: island NPCs get their spot from `placeNpcs`, Quest Island NPCs from `questIslandNpcs`.
- **mp3 name:** `text` with `！ ! 、 , 〜 ~ 。 . ／ /` and spaces dropped, `？` kept (`またお寿司の話しよ！` → `またお寿司の話しよ.mp3`). `audioName()` in `toNPCProps.ts` and `audio_name()` in `python/gemini_tts.py` are the same rule. A missing file = the line stays silent.
- **`{target}`** in `kana` / `en` is replaced by the quest's kana (Ryuuko's intro). Such a line has no `text`.

### Conditions

`Condition` in `src/components/Game/Entity/dialogBubble.tsx`. A label that is not in this table is an error (in `tsc` for code, when the file loads for a json, and in `dialog.py render`).

| Condition | Island NPC | Quest Island |
|---|---|---|
| `greeting` | Player walks into range | not used: the scene's first spoken line is shown |
| `default` | First talk | — |
| `spoken` | Every talk after the first, in the same scene | — |
| `quest` | The quest offer, while the NPC's quest is open | Before the quest: the offer to start (phase `intro`) |
| `questCleared` | After the NPC's quest is cleared | — |
| `level<N>-start` | — | Level N is running (`play1`, `play2`) |
| `level<N>-clear` | — | Level N is cleared (`levelUp` / `break` for N = 1, `success` for N = 2) |
| `level<N>-fail` | — | Level N failed (`fail`) |
| `retry` | — | After the last level: the replay offer (`again`) |

### Into the game

`src/components/Game/npcs/npcs.ts`:

```ts
import jordi from "./dialogs/jordi.json"

export const ISLAND_1_NPC: NPCProps[] = [jordi, shuto, tiffany, genki, sarah].map(s => toNPCProps(s))
```

| Function (`toNPCProps.ts`) | What it gives |
|---|---|
| `toDialogs(script, target?)` | Every entry as a `Dialog` (`jp` = kana, `en`, `audio` = mp3 name, `choices`) |
| `toNPCProps(script, x?, y?, dialog?)` | One `NPCProps` with the default body size |
| `sceneDialog(script, condition, target?)` | Quest Island: the entry of one condition as `[greeting, talk]`. The greeting is the entry's first spoken line; the talk is `quest` when it has choices, else `default`; a `level<N>-start` entry is the greeting only |

Quest Island: `questIslandNpcs(w, h, phase, target, failedLevel)` turns the training phase into a condition (`phaseCondition`) and builds Ryuuko and Elena with `sceneDialog`.

## Speech Generation

after [Scripting](#scripting)

Setup (once): see `python/README.md`. Run every command from `python/`.

### render

```bash
python dialog.py render ../src/components/Game/npcs/dialogs/jordi.json
```

- Each line with a `text` → `public/dialog/<npc>/<file_name>.mp3` (what the game plays). The same `text` twice is rendered once.
- Whole file → `python/output/<npc>.mp3` (preview only, gitignored).
- Each line is cached in `python/.cache/` on (voice, text, style, model), so re-rendering only calls the API for new or edited lines. `--force` ignores the cache.
- The file is checked first: unknown keys, a wrong condition label, or a `{target}` line with a `text` stop the render.

### yaml scenes

`python/dialogs/*.yaml` is the older format, still rendered by the same command. Use it for clips that are not an NPC's own dialog: a scene with several speakers, Ryuuko's kana clips (`ryuuko.yaml`), and the island NPCs' quest-offer lines for the other kana rows (`「き」のクエストだよ！` in `jordi.yaml`, read by `QUEST_LINE` in `npcs.ts`).

```yaml
scene: jordi
lines:
  - speaker: jordi
    text: 「き」のクエストだよ！
    style: upbeat and playful
```

- `speaker`: the voice's `name` in `voices.json`. It is also the output folder.
- `text`: the kanji form of the line.
- `style` (optional): the mood of this line only.

To draft a yaml: `python dialog.py write "ordering ramen" --speakers jordi,shuto --lines 6`.

### check

1. Every printed `-> public/dialog/...` file exists.
2. Play the game and talk to the NPC.
