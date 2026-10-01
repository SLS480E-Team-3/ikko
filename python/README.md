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
| `python eightbit.py [mp3, mid or folder]...` | Saves each input as `<name>_8bit.mp3`. MIDI output goes to `public/BGM/8bits`, and mp3 output goes next to the input. With no paths, it renders every MIDI in `public/BGM/midi`. No API key is needed. A folder is searched recursively, and earlier `_8bit` outputs are skipped. What happens depends on the input:<br>• **`.mid` / `.midi`** is played as NES-style chiptune. The lowest part is a triangle bass, the other parts are pulse waves, and channel 10 is noise drums.<br>• **`.mp3`** is bitcrushed.<br>Options for MIDI: `--speed 1` (tempo multiplier), `--transpose 0` (semitones).<br>Options for mp3: `--bits 8` (lower is grittier), `--rate 11025` (lower is fizzier, 177–44100), `--stereo` (the default is mono).<br>Options for both: `--out DIR`, `--force`. |
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

## Sprites

`sprite.py` makes a game object sprite from a reference image. It uses the same `GEMINI_API_KEY` as the voices.

Setup, once, on top of the steps above:

```bash
pip install -e /path/to/image_pixelizer
```

`image_pixelizer` is a separate local repo, not on PyPI.

The reference image comes from a browser search. The Claude Code skill `/make-sprite <object>` (`../.claude/skills/make-sprite/SKILL.md`) runs that search and then this script.

```bash
python sprite.py make tree --ref output/refs/tree.jpg
```

What `make` does:
1. Sends the reference and a fixed prompt to `gemini-3.1-flash-image` (Nano Banana 2): redraw the object alone, from the front, looking down about 45°, on a flat magenta background.
2. Keys out the magenta (every pixel whose red and blue are both well above its green becomes transparent) and crops to the object.
3. Pixelizes it with `image_pixelizer` and saves `../public/img/<name>.webp` (lossless, one image pixel per art pixel).
4. Prints the entry to paste into `src/components/Game/Object/objects.ts`. The `hitBox` is the bottom 20% of the sprite in height, and as wide as the object is in its bottom 8% of rows (a tree's trunk, not its crown), so the player is blocked at the base and walks behind the top.

| Option | Default | What it does |
|---|---|---|
| `--ref` | required | Reference image (png, jpg or webp). Keep these in `output/refs/`, which is gitignored. |
| `-w`, `--width` | 64 | Sprite width in pixels. The height follows the object's shape. |
| `-c`, `--colors` | 16 | Palette size. |
| `--scale` | 4 | World px per sprite pixel, used for `w`, `h` and `hitBox` in the printed entry. |
| `--background` | `magenta` | What Gemini paints behind the object. `transparent` asks for real transparency, but the model usually paints a checkerboard instead, which can't be removed. |
| `--bg-tol` | 12 | Color tolerance when removing a painted background that is not magenta (only used with `--background transparent`). |
| `--force` | off | Ignore the cache and ask Gemini again. |

The raw Gemini image is cached in `.cache/` by reference, prompt and model, so changing `-w`, `-c` or `--scale` makes no new request. A copy is saved to `output/<name>_raw.png`.
