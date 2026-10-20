---
name: make-sprite
description: Make a pixel-art game object sprite (tree, rock, tower...) for Ikko. Finds a reference image in the browser, downloads it, runs python/sprite.py, and adds the entry to objects.ts. Use when the user says "make {object}" or asks for a new object sprite.
argument-hint: <object> [notes]
---

# Make a sprite

Arguments: `$ARGUMENTS`. The first word is the object name (for example `tree`); it becomes the file name and the catalog key. Anything after it is notes about the object (for example `cherry tree in bloom`).

Below, `{object}` is the object name.

## 1. Search for a reference image

- Use the built-in browser and an image search for "{object}", plus the notes if there are any.
- Add words like "isolated", "cutout", "transparent background", "icon" or "illustration", so the results show the object alone.
- Look at 3 or more candidates before picking.

A good reference:
- Shows only that one {object} and nothing else, whole, with nothing cropped.
- Has no background: transparent or flat white. No sky, ground, buildings or scenery behind it.
- Is small: under 1 MB. If the original is larger, pick a smaller version of it (for example a resized thumbnail) or another image.
- Is seen from the front or slightly from above, with the base visible.
- Is a clear photo or a clean illustration, at least 512 px on the short side.
- Has no text, watermark, logo, people or brand characters.
- Has a typical shape for a {object}, one a beginner would recognize at 32 px wide.

## 2. Download the pick

- Download the pick right away, without asking. The user has approved reference downloads for this skill.
- Only download an image that meets the rules in step 1 (one object, no background, under 1 MB).
- After downloading, state: file name, source page, image URL, pixel size, file size, and one line on why this one.
- Keep one backup candidate in mind.

## 3. Make the sprite

- Save the image to `python/output/refs/{object}.<ext>` (gitignored), keeping the image's real extension.
- From `python/`, with the venv active, run:

```bash
python sprite.py make {object} --ref output/refs/{object}.<ext>
```

- The `.webp` must be 20 KB or less (`--max-kb`, default 20). If the script stops on the limit, lower `-w` or `-c`; don't raise the limit without asking.
- Show the user `public/img/_original/{object}.png` (the full-size Gemini image, gitignored) and `public/img/{object}.webp` (32 px wide, drawn 8x in the game).
- Tell the user the printed `generation id`. It is saved in `python/generations.json` with the prompt, so a similar design can be made later.
- Add the printed entry to `src/components/Game/Object/objects.ts`.
- Run `npx tsc --noEmit`.
- Do not commit.

## Notes

- A generic ground plant or decoration (fern, grass tuft, pebbles) needs no reference: skip steps 1 and 2 and run `python sprite.py make {object}` with no `--ref`. Leave `hitBox` out of its entry.
- The reference only guides the redraw. Gemini redraws the object from the front at a 45° top-down view on magenta, so the reference doesn't need that angle or a transparent background.
- The reference is not shipped. Only the redrawn sprite goes to `public/img/`.
- If Gemini returns no image, the request may have been blocked. Take the backup candidate.
- A new reference file makes a new Gemini request. The same file with a different `-w`, `-c` or `--scale` uses the cache.
- The script's options and what each step does are in `python/README.md`, under Sprites.
