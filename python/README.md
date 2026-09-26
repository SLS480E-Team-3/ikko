# Gemini TTS toolkit

This toolkit makes NPC voices and dialog audio with Gemini speech generation, in place of ondoku3. There are two parts:
- **Voice design**: builds a custom voice from a profile.
- **TTS**: renders scenes to mp3.

Run every command from this `python/` folder.

## Setup

```bash
brew install ffmpeg
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Then open `.env` in an editor and paste your key as `GEMINI_API_KEY=...`.
- `.env` is gitignored.
- The scripts never print the key.

## Commands

| Command | What it does |
|---|---|
| `python voice.py create <name>` | Asks for the 15 profile fields, designs the voice, saves it to `voices.json`, and has `gemini-3.8-flash` turn the prompt `SAMPLE_LINE_PROPMT` in `voice.py` ("Hello, my name is {name}. I'm {age} years old. よろしく!") into a Japanese self-introduction that fits the profile, and renders it in the new voice to `public/dialog/<name>/_sample.mp3`. The Japanese line is printed. |
| `python voice.py create jordi --from voices.json` | Same, but reads the profile from a file instead of asking. The file can be `voices.json` (the entry is picked by name) or a flat profile JSON. |
| `python voice.py list` | Shows every voice and its `voice_id`, or "not created". |
| `python dialog.py write "ordering ramen" --speakers jordi,kaito` | Drafts `dialogs/ordering_ramen.yaml` with `gemini-3.8-flash`. Options: `--lines N`, `--out`, `--force`. |
| `python dialog.py render dialogs/sample.yaml` | Saves each line to `public/dialog/<speaker>/<line>.mp3` for the game, plus the whole scene to `output/sample.mp3` as a preview. Options: `--pause-ms 350`, `--force` (skip the cache), `--per-line` (never use the multi-speaker request). |

`--model` overrides the default model. The defaults are:
- `gemini-3.8-flash-tts` for speech and voices
- `gemini-3.8-flash` for writing

## Files

- **`voices.json`**: one entry per voice with these fields:
  - `name`
  - `profile` (language, accent, gender, age, personality, timbre, energy, pitch, pitch_range, speed, volume, articulation, register, pauses, use_case)
  - `description`, the text sent to Voice design
  - `voice_id`, `model`, `created`
- **`dialogs/<scene>.yaml`**: one scene per file.
  - Each line has `speaker`, `text` and an optional `style`.
  - `text` is spoken exactly as written.
  - `style` is only the mood of the moment, like `excited` or `teasing, quiet`. Put age, gender and accent in the profile instead.
  - A speaker that isn't in `voices.json` needs a prebuilt voice, set in `voices:` (for example `kaito: Charon`). If the speaker's name is itself a prebuilt voice (for example `Puck`), it doesn't need an entry.
- **`../public/dialog/<voice name>/`**: the game's audio. Each line is `<line>.mp3`, named like the third item of a `say()` line in `npcs.ts`: the text with ！ 、 〜 。 and spaces dropped, and ？ kept. The folder name is the `name` in `voices.json` (e.g. `jordi`), or the speaker name for a prebuilt voice.
- **`output/`**: whole-scene preview mp3s. This folder is gitignored.

## Voice profile

Every voice in `voices.json` needs all 15 `profile` fields. `create` joins them into the `description` sent to Voice design, so they're free text. Short, concrete phrases work best.

| Field | What it sets | Example |
|---|---|---|
| `language` | The spoken language (`Japanese` → ja-JP, `English` → en-US) | `Japanese` |
| `accent` | Regional accent or dialect | `Tokyo standard`, `Kansai dialect` |
| `gender` | Voice gender | `female` |
| `age` | Age in years, as text | `"20"` |
| `personality` | Overall character, which the other fields should agree with | `sweet, gentle, a little dreamy` |
| `timbre` | Tone color of the voice | `soft, slightly husky` |
| `energy` | Default liveliness | `high and cheerful` |
| `pitch` | Base pitch | `slightly low` |
| `pitch_range` | How much the pitch moves, and how endings sound | `wide with rising endings` |
| `speed` | Speaking rate | `slightly slow` |
| `volume` | Loudness | `medium-soft` |
| `articulation` | How crisp or loose the pronunciation is | `relaxed, a little lazy on sentence endings` |
| `register` | Speech style or politeness level | `casual Kansai-ben`, `casual, with light desu/masu when polite` |
| `pauses` | Gaps between phrases | `medium, unhurried` |
| `use_case` | What the voice is for | `game character` |

The profile sets who the voice is. A line's `style` in a dialog yaml only sets the mood of that line.

### Voices

| Name | NPC | Gender, age | Accent | Personality | Pitch | Energy |
|---|---|---|---|---|---|---|
| `jordi` | Jordi | female, 20 | Tokyo standard | energetic, friendly, a bit playful | slightly high | high and cheerful |
| `shuto` | Shuto | male, 22 | Kansai dialect | unenergetic, calm, laid-back | low | low and friendly |
| `genki` | Genki | male, 23 | Tokyo standard | calm, warm, like an older brother | slightly low | steady, gently upbeat |
| `tiffany` | Tiffany | female, 20 | Tokyo standard | sweet, gentle, a little dreamy | medium-high | mellow and content |
| `sarah` | Sarah | female, 21 | Tokyo standard | cheerful, easygoing, friendly | medium | light and upbeat |

`voices.json` holds the full profiles. `python voice.py list` shows which voices have been created.

## Rendering rules

- **One request:** if every speaker uses a prebuilt voice and there are at most 2 speakers, the whole scene is sent as a single multi-speaker request. That clip can't be split into lines, so it only produces the `output/` preview. Use `--per-line` to get the game files.
- **Line by line:** otherwise, for example when a custom voice like jordi is in the scene, each line is its own request. ffmpeg then joins the lines with a short pause between them.
- **Cache:** each rendered line is stored in `.cache/` under a hash of (voice ID, text, style, model).
  - When you re-render, only new or edited lines call the API. The summary line shows how many were API calls and how many came from the cache.
  - A multi-speaker scene is cached as a single clip, so any edit re-renders the whole scene.

## Errors

API failures print one line with the cause. The main cases are:
- a bad or unauthorized key
- quota or rate limit reached
- a field the API doesn't support
- a model or voice that wasn't found
- a server error

## Limits

- 200 custom voices per Google Cloud project.
- A custom voice expires 1 year after it's created.
- Multi-speaker requests allow at most 2 speakers, and only prebuilt voices.
