# Dialogs

saved in /public/dialog/`<character>`

## Scripting

at src/components/Game/npcs/npcs.ts

### Formatting
```ts
const say = (condition: Dialog['condition'], ...lines: Line[]): Dialog => ({
    condition, jp: lines.map(l => l[0]), 
    en: lines.map(l => l[1]),
    audio: lines.map(l => l[2] ?? '') 
})

const npc = (name: string, voice: string | undefined, x: number, y: number, color: string, dialog: Dialog[]): NPCProps => ({
    voice,
    ent: { name, x, y, w: ENT_W, h: ENT_H, color, facing: 'none' },
    dialog,
})
```

**EXAMPLE**
```ts
npc('Jordi', 'jordi', 3420, 5070, 'plum', [ 
        say('greeting', ['こんにちは！', 'Hello!', 'こんにちは']),
        say('default',
            ['わたしはおすしがだいすき！', 'I love sushi!', '私はお寿司が大好き'], 
            ['とくにサーモンがすき！', 'Salmon is my favorite', 'とくにサーモンがすき'],
            ['あなたもおすしすき？', 'Are you also a sushi muncher?', 'あなたもお寿司好き？']), 
        say('spoken', ['またおすしのはなししよ！', "Let's talk sushi again", 'またお寿司の話しよ']), 
    ])

say('greeting', ['こんにちは！', 'Hello!', 'こんにちは']) // dialog_type, ['{line}', '{english_meanig}', '{file_name}']
```

### npc() arguments

| Arg | What it is |
|---|---|
| `name` | Name shown above the NPC |
| `voice` | Folder under `public/dialog/`, and the voice's `name` in `python/voices.json`. `undefined` = silent |
| `x`, `y` | Spot in world px (spawn is around 3500, 5000) |
| `color` | Body color |
| `dialog` | List of `say()` entries |

### Dialog types

| Condition | When it plays |
|---|---|
| `greeting` | Player walks into range |
| `default` | First talk |
| `spoken` | Every talk after the first, in the same scene |
| `questCleared` | After the NPC's quest is cleared |

### Lines

`[line, english, file_name]`

- **line**: shown on screen. Keep it hiragana/katakana (no furigana yet) and ≤ 15 characters, so it fits one bubble page.
- **english**: typed under the line.
- **file_name**: the mp3 in `public/dialog/<voice>/`, without `.mp3`.
  - Write it in kanji (the TTS reads kanji more accurately).
  - Drop `！ ! 、 , 〜 ~ 。 . ／ /` and spaces, keep `？`.
  - e.g. `またお寿司の話しよ！` → `またお寿司の話しよ`
  - Left out, or the file doesn't exist = the line stays silent.

## Speech Generation

after [Scripting](#scripting)

Setup (once): see `python/README.md`. Run every command from `python/`.

### yaml

in python/dialogs

```yaml
scene: jordi
lines:
  - speaker: jordi
    text: こんにちは！
  - speaker: jordi
    text: 私はお寿司が大好き！
    style: happy, enthusiastic
  - speaker: jordi
    text: とくにサーモンがすき！
    style: dreamy, fond
  - speaker: jordi
    text: あなたもお寿司好き？
    style: curious, playful
  - speaker: jordi
    text: またお寿司の話しよ！
    style: warm, friendly goodbye
```

- `speaker`: the voice's `name` in `voices.json`. It is also the output folder.
- `text`: the kanji form of the line. After dropping punctuation it must equal the `file_name` in `npcs.ts`.
- `style` (optional): the mood of this line only, e.g. `excited`, `teasing, quiet`. Age, gender and accent belong in the voice profile, not here.

To draft a yaml instead of writing it by hand:

```bash
python dialog.py write "ordering ramen" --speakers jordi,shuto --lines 6
```

### render

```bash
python dialog.py render dialogs/jordi.yaml
```

- Each line → `public/dialog/<speaker>/<file_name>.mp3` (what the game plays).
- Whole scene → `python/output/<scene>.mp3` (preview only, gitignored).
- Each line is cached in `python/.cache/`, so re-rendering only calls the API for new or edited lines. `--force` ignores the cache.

### check

1. The printed `-> public/dialog/...` file names match the `file_name`s in `npcs.ts`.
2. Play the game and talk to the NPC.

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

### 3. Use it

1. `npc('Jordi', 'jordi', ...)` in `npcs.ts` → [Scripting](#scripting)
2. `python/dialogs/jordi.yaml` → [Speech Generation](#speech-generation)

### Limits

- 200 custom voices per Google Cloud project.
- A voice expires 1 year after `created`.
