"""Make a game object sprite: reference image (optional) -> Gemini drawing
(front, top-down 45 degrees) -> image_pixelizer -> public/img/<name>.webp,
plus the ObjectDef entry for src/components/Game/Object/objects.ts."""

import argparse
import hashlib
import io
import json
import time
from pathlib import Path

from gemini_tts import CACHE_DIR, OUTPUT_DIR, ROOT, client, die
# reuses the TTS toolkit's client(): it loads GEMINI_API_KEY from python/.env,
# so sprites need no key setup of their own. Paths hang off ROOT, so the
# script works from any cwd

IMG_DIR = ROOT.parent / "public" / "img"
ORIG_DIR = IMG_DIR / "_original"
IMAGE_MODEL = "gemini-3.1-flash-image"
# IMG_DIR is where the game reads sprites from (ObjectDef.sprite.src =
# '/img/<name>.webp'). The model is "Nano Banana 2" in client().models.list().
# ORIG_DIR (public/img/_original/, gitignored, dev only) holds the full-size
# Gemini image of every sprite as <name>.png, next to the sprites made from it

SUBJECT_REF = (
    "Generate an image: a {name}, the same kind of object as in the reference image, as a single game object sprite. "
    "Use the reference only to know what the object is and its overall shape; do not copy its drawing style. "
)
SUBJECT_TEXT = "Generate an image: a {name} as a single game object sprite. "
PROMPT = (
    "{subject}"
    "Style: a detailed hand-drawn game illustration of the real thing. Realistic shape and proportions, as the real object looks, "
    "with natural, slightly muted colors. Flat cel shading in two or three tones per color, "
    "with the real structure drawn in (branches and leaf clusters, bark, beams, cracks). "
    "A thin clean dark outline around the object and its main parts. "
    "Not a cartoon, not an emoji, not an icon, not a photo and not a 3D render: "
    "no face, no cute, rounded or exaggerated shapes, no glossy highlights, no gradients. "
    "Camera: in front of the object, looking down at it from about 45 degrees "
    "(3/4 top-down view, like a classic top-down RPG), so its front and its top are both visible. "
    "Show the whole object, centered, standing upright, nothing cropped. "
    "No text, no ground, no cast shadow, no other objects. "
    "Background: {background}."
) # prompt: **"Flat simple colors with clear dark outlines", "Redraw the {name} from the reference image"** -> **a Style block describing the look of tree and Tokyo-tower, and the reference used for identity only**, mechanism: the old wording was short, so the style came from the reference: a photo (tree, Tokyo-tower) gave a detailed drawing with real proportions, an emoji (palm-tree) gave a cartoon. The new text names that look itself (real proportions, muted colors, cel shading, thin outline) and rules out both the cartoon and the photo, so the result no longer depends on the reference's style. The prompt is part of the cache key, so every sprite made after this is a new request
BACKGROUNDS = {
    "transparent": "fully transparent",
    "magenta": "one flat solid magenta color (#FF00FF) with no gradient and no pattern",
}
# one fixed prompt, so every object comes out in the same view and style.
# Only the first sentence differs: SUBJECT_REF when there is a reference image,
# SUBJECT_TEXT when there is none (a generic thing like a fern needs no
# reference).
# "magenta" is the default: asked for "transparent", the model paints a
# checkerboard instead of real alpha, which can't be removed; a flat magenta
# can be keyed out in cut_out below

HITBOX_FRAC = 0.2
# share of the sprite's height, measured from the bottom, that blocks the
# player. The view is 45 degrees from above, so only the base is on the
# ground; everything above it is drawn over and can be walked behind

GEN_LOG = ROOT / "generations.json"


def memo(kind: str, name: str, prompt: str, cached: Path, res=None, ref: Path | None = None) -> None:
    log = json.loads(GEN_LOG.read_text()) if GEN_LOG.exists() else {}
    key = f"{kind}/{name}"
    if res is None and log.get(key, {}).get("cache") == cached.name:
        return
    log[key] = {
        "id": getattr(res, "response_id", None),
        "model": IMAGE_MODEL,
        "model_version": getattr(res, "model_version", None),
        "created": time.strftime("%Y-%m-%d %H:%M:%S") if res is not None else None,
        "prompt": prompt,
        "ref": str(ref) if ref else None,
        "cache": cached.name,
    }
    GEN_LOG.write_text(json.dumps(log, indent=2, ensure_ascii=False) + "\n")
    print(f"generation id: {log[key]['id']} (saved in {GEN_LOG.name})")
# the memo of every Gemini image: generations.json, one entry per output,
# keyed "sprite/<name>" or "tile/<material>". "id" is the response_id Gemini
# gives the request; with it are the things a similar image is made from: the
# exact prompt, the model, the reference path and the raw image's file name in
# .cache/. A new request (res given) overwrites the entry. A cache hit
# (res None) writes an entry only when there is none for this cache file, with
# id null, since the id of that older request was not kept


IMAGE_TRIES = 3
# how many times a text-only image request is sent before the script gives up


def request_image(contents: list, text_only: bool):
    from google.genai import types
    config = types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]) if text_only else None
    tries = IMAGE_TRIES if text_only else 1
    for attempt in range(tries):
        try:
            res = client().models.generate_content(model=IMAGE_MODEL, contents=contents, config=config)
        except Exception as e:
            die(f"Gemini image request failed: {e}")
        parts = (res.candidates[0].content.parts if res.candidates and res.candidates[0].content else None) or []
        for part in parts:
            if part.inline_data and part.inline_data.data:
                return part.inline_data.data, res
        if tries > 1:
            print(f"no image (try {attempt + 1} of {tries})")
    return None
# the one place that asks Gemini for an image; generate (sprites) and
# generate_tile (ground) both call it. Returns (image bytes, response), or
# None when no image came back. A text-only request needs response_modalities
# ["TEXT", "IMAGE"]: with ["IMAGE"] alone, or with no config, this model ends
# it with finish_reason IMAGE_RECITATION and sends no image. It sometimes
# still does for the same prompt, so a text-only request is tried up to
# IMAGE_TRIES times. A request with a reference image is sent once with no
# config, as before. An API error stops at once


def generate(name: str, ref: Path | None, background: str, force: bool) -> bytes:
    data = ref.read_bytes() if ref else b""
    subject = (SUBJECT_REF if ref else SUBJECT_TEXT).format(name=name.replace("-", " ") if not ref else name)
    prompt = PROMPT.format(subject=subject, background=BACKGROUNDS[background])
    key = hashlib.sha256(data + prompt.encode() + IMAGE_MODEL.encode()).hexdigest()[:16]
    cached = CACHE_DIR / f"sprite_{key}.png"
    if cached.exists() and not force:
        print(f"cached: {cached.name}")
        memo("sprite", name, prompt, cached, ref=ref)
        return cached.read_bytes()
    contents: list = [prompt]
    if ref:
        from google.genai import types
        from PIL import Image
        mime = Image.MIME.get(Image.open(io.BytesIO(data)).format or "", "image/png")
        contents = [types.Part.from_bytes(data=data, mime_type=mime), prompt]
    got = request_image(contents, text_only=ref is None)
    if got is None:
        die("Gemini returned no image (the request may have been blocked) — try another reference")
    CACHE_DIR.mkdir(exist_ok=True)
    cached.write_bytes(got[0])
    memo("sprite", name, prompt, cached, got[1], ref)
    return got[0]
# one API call per (reference bytes, prompt, model): the raw image is stored
# in .cache/ under that hash, so changing -w / -c / --scale re-runs only the
# local steps. The reference's mime type is read from the file itself, not
# its extension. With no reference the key is (prompt, model) and the request
# is text-only; hyphens in the name are sent as spaces ("beach grass")


KEY_MARGIN = 40
# how far red and blue must both sit above green for a pixel to count as
# magenta background


def cut_out(raw: bytes, tol: int, background: str):
    import numpy as np
    from PIL import Image
    from image_pixelizer import load, remove_background
    img = load(raw)
    px = np.asarray(img).copy()
    if px[..., 3].min() == 255:
        if background == "magenta":
            rgb = px[..., :3].astype(int)
            px[np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1] > KEY_MARGIN, 3] = 0
            img = Image.fromarray(px, "RGBA")
        else:
            img = remove_background(img, tol)
    box = img.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
    if box is None:
        die("the generated image is fully transparent")
    return img.crop(box)
# real alpha from the model is kept as is. An opaque magenta image is chroma
# keyed: every pixel whose red and blue are both KEY_MARGIN above its green
# becomes transparent. Unlike a flood fill from the borders this also clears
# the gaps enclosed by the object (sky between branches) and the anti-aliased
# rim where magenta blends into the outline, which showed up as a pink fringe.
# Any other opaque background falls back to image_pixelizer's flood fill.
# Then crop to the pixels that are at least half opaque, so the sprite has no
# empty margin and its bottom row is the object's base


FOOT_FRAC = 0.08
# share of the sprite's height, from the bottom, that is read as the object's
# footprint (where it touches the ground)


def hitbox(sprite, scale: int) -> dict:
    import numpy as np
    alpha = np.asarray(sprite)[..., 3] > 0
    band = max(1, round(sprite.height * HITBOX_FRAC))
    foot = max(1, round(sprite.height * FOOT_FRAC))
    cols = np.flatnonzero(alpha[-foot:].any(axis=0))
    x0, x1 = int(cols[0]), int(cols[-1]) + 1
    return {"x": x0 * scale, "y": (sprite.height - band) * scale, "w": (x1 - x0) * scale, "h": band * scale}
# height: the bottom HITBOX_FRAC of the sprite. Width: only the columns with
# an opaque pixel in the bottom FOOT_FRAC rows, so a tree blocks at its trunk;
# reading the width from the whole band picked up the low branches of the
# crown and blocked almost the full sprite width. Values are world px
# (sprite px * scale), relative to the sprite's top-left, which is what
# gameObject.ts's HitBox expects


def make(args) -> None:
    try:
        from image_pixelizer import pixelize
    except ImportError:
        die("image_pixelizer not installed — see README.md, Sprites > Setup")
    ref = Path(args.ref) if args.ref else None  # ref: **always a Path** -> **None when --ref is left out**, mechanism: generate sends a text-only request for None
    if ref and not ref.is_file():
        die(f"reference image not found: {ref}")
    raw = generate(args.name, ref, args.background, args.force)
    ORIG_DIR.mkdir(parents=True, exist_ok=True)
    (ORIG_DIR / f"{args.name}.png").write_bytes(raw)  # raw copy: **output/<name>_raw.png** -> **public/img/_original/<name>.png**, mechanism: the original sits next to the sprites, in one gitignored folder
    cut = cut_out(raw, args.bg_tol, args.background)
    grid_h = max(1, round(args.width * cut.height / cut.width))
    sprite = pixelize(cut, args.width, grid_h, colors=args.colors)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    out = IMG_DIR / f"{args.name}.webp"
    buf = io.BytesIO()
    sprite.save(buf, "WEBP", lossless=True)
    kb = buf.tell() / 1024
    if kb > args.max_kb:
        die(f"{out.name} would be {kb:.1f} KB, over the {args.max_kb} KB limit — lower -w or -c, or raise --max-kb")
    out.write_bytes(buf.getvalue())
    # the webp is encoded into memory first and only written when it is within
    # --max-kb, so an oversized sprite never lands in public/img. A 32-64 px wide,
    # 16 color sprite is 1-3 KB; the default 20 KB leaves room for tall or
    # wider objects and still stops a wrong -w (e.g. 640)
    hb = hitbox(sprite, args.scale)
    print(f"wrote {out.relative_to(ROOT.parent)} ({sprite.width}x{sprite.height}, {kb:.1f} KB)")
    print("add to src/components/Game/Object/objects.ts:")
    print(f"    {args.name}: {{")
    print(f"        sprite: {{ src: '/img/{args.name}.webp', w: {sprite.width * args.scale}, h: {sprite.height * args.scale}, alt: '{args.name}' }},")
    print(f"        hitBox: {{ x: {hb['x']}, y: {hb['y']}, w: {hb['w']}, h: {hb['h']} }},")
    print("    },")
# the file is the true 1:1 sprite (one image pixel per art pixel) as lossless
# webp, so no color changes; ObjectRenderer draws it at sprite.w x sprite.h
# with image-rendering: pixelated, which is where --scale comes in. The raw
# Gemini image is copied to public/img/_original/ to compare against


BG_DIR = IMG_DIR / "bg"
TILE_PROMPT = (
    "Generate an image: a flat top-down ground texture of {material}, seen straight from above, "
    "filling the whole image edge to edge. "
    "Even, low-contrast, small repeating detail, no objects, no shadows, no border, no text."
)
# ground tiles live in public/img/bg/ (a section's tile = '/img/bg/<material>.webp').
# One fixed prompt, like PROMPT above, so every ground comes out in the same
# quiet style and sprites stand out on top of it


def generate_tile(material: str, notes: str, force: bool) -> bytes:
    prompt = TILE_PROMPT.format(material=material.replace("-", " ")) + (f" Notes: {notes}." if notes else "")
    key = hashlib.sha256(prompt.encode() + IMAGE_MODEL.encode()).hexdigest()[:16]
    cached = CACHE_DIR / f"tile_{key}.png"
    if cached.exists() and not force:
        print(f"cached: {cached.name}")
        memo("tile", material, prompt, cached)
        return cached.read_bytes()
    got = request_image([prompt], text_only=True)  # request: **its own loop here** -> **request_image()**, mechanism: the text-only request and its retries are shared with generate
    if got is None:
        die("Gemini returned no image (the request may have been blocked) — try other notes")
    CACHE_DIR.mkdir(exist_ok=True)
    cached.write_bytes(got[0])
    memo("tile", material, prompt, cached, got[1])
    return got[0]
# text-only request: a ground texture needs no reference image, so there is no
# browser search or download. Cached in .cache/ by (prompt, model), so the
# same material + notes is one API call and -w / -c re-run only the local
# steps. Scenes use one plain color per section now (ISLAND_SECTIONS in
# gameScene.tsx), so this runs only when a textured tile is asked for by name


def tile(args) -> None:
    try:
        from image_pixelizer import load, pixelize
    except ImportError:
        die("image_pixelizer not installed — see README.md, Sprites > Setup")
    from PIL import Image, ImageOps
    raw = generate_tile(args.material, args.notes, args.force)
    OUTPUT_DIR.mkdir(exist_ok=True)
    (OUTPUT_DIR / f"{args.material}_tile_raw.png").write_bytes(raw)
    img = load(raw)
    side = min(img.size)
    left, top = (img.width - side) // 2, (img.height - side) // 2
    small = pixelize(img.crop((left, top, left + side, top + side)), args.width, args.width, colors=args.colors).convert("RGB")
    w = args.width
    out_img = Image.new("RGB", (w * 2, w * 2))
    out_img.paste(small, (0, 0))
    out_img.paste(ImageOps.mirror(small), (w, 0))
    out_img.paste(ImageOps.flip(small), (0, w))
    out_img.paste(ImageOps.flip(ImageOps.mirror(small)), (w, w))
    # center-crop to a square, pixelize to w x w, then build a 2w x 2w image
    # from the tile and its three mirrors (flip x, flip y, both). Every edge
    # of that image meets its own mirror image when it repeats, so there is no
    # visible seam whatever Gemini drew
    buf = io.BytesIO()
    out_img.save(buf, "WEBP", lossless=True)
    kb = buf.tell() / 1024
    out = BG_DIR / f"{args.material}.webp"
    if kb > args.max_kb:
        die(f"{out.name} would be {kb:.1f} KB, over the {args.max_kb} KB limit — lower -w or -c, or raise --max-kb")
    BG_DIR.mkdir(parents=True, exist_ok=True)
    out.write_bytes(buf.getvalue())
    r, g, b = (round(v) for v in out_img.resize((1, 1), Image.BOX).getpixel((0, 0)))
    print(f"wrote {out.relative_to(ROOT.parent)} ({out_img.width}x{out_img.height}, {kb:.1f} KB)")
    print("section for ISLAND_SECTIONS in src/components/Game/Scene/gameScene.tsx:")
    print(f"    tile: '/img/bg/{args.material}.webp', color: '#{r:02x}{g:02x}{b:02x}'")
# same size guard as make. The printed color is the tile's average (a 1x1 box
# resize), used as the section's backgroundColor: it shows while the tile
# loads and is the fallback when there is no tile


MERGE_SCALE = 4


def merge(args) -> None:
    import math
    import random
    from PIL import Image
    w, rows = args.width, args.rows
    rng = random.Random(args.seed)
    waves = [(k, rng.uniform(0, math.tau), amp) for k, amp in ((1, 0.5), (2, 0.3), (5, 0.2))]
    fade = rows / 4
    img = Image.new("RGBA", (w, rows), (255, 255, 255, 0))
    px = img.load()
    for x in range(w):
        wave = sum(amp * math.sin(math.tau * k * x / w + ph) for k, ph, amp in waves)
        solid = rows * (0.45 + wave * 0.3)  # solid: **rows * (5 / 12 + wave / 6)** -> **rows * (0.45 + wave * 0.3)**, mechanism: the border looked nearly straight in the game; the waves now move the line by up to 30% of the rows each way
        for up in range(rows):
            if up < solid - 3:
                keep = True
            elif up < solid:
                keep = rng.random() > 0.25
            else:
                keep = rng.random() < 0.6 * max(0.0, 1 - (up - solid) / fade) ** 2
            if keep:
                px[x, rows - 1 - up] = (255, 255, 255, 255)
    # `up` counts rows from the bottom of the strip. Each column has a solid
    # height: 45% of the rows, moved up or down by three sine waves (1, 2
    # and 5 cycles over the width, so the line is uneven but the left and
    # right ends meet when the strip repeats). The waves sum to at most 1, so
    # the solid height stays between 15% and 75% of the rows. Below it the
    # pixel is opaque, except that the top 3 rows of the solid part lose one
    # pixel in four (holes). Above it a pixel is kept by chance, 60% at the
    # line and falling to 0 over rows / 4 (loose pixels). The top row is
    # always empty and the bottom row always full
    out_img = img.resize((w * MERGE_SCALE, rows * MERGE_SCALE), Image.NEAREST)
    buf = io.BytesIO()
    out_img.save(buf, "WEBP", lossless=True)
    kb = buf.tell() / 1024
    out = BG_DIR / "merge.webp"
    if kb > args.max_kb:
        die(f"{out.name} would be {kb:.1f} KB, over the {args.max_kb} KB limit — lower -w or --rows, or raise --max-kb")
    BG_DIR.mkdir(parents=True, exist_ok=True)
    out.write_bytes(buf.getvalue())
    print(f"wrote {out.relative_to(ROOT.parent)} ({out_img.width}x{out_img.height}, {kb:.1f} KB)")
    print(f"MERGE_H in src/components/Game/Scene/gameScene.tsx: {out_img.height}")
# the merge mask: the strip drawn where two ground sections meet. It is only
# a shape (white, alpha 0 or 255); gameScene.tsx uses it as a CSS mask over
# the lower section's tile, so one file works for every pair of soils. No
# Gemini request: the shape comes from a seeded generator, so the same
# --seed gives the same file. Saved MERGE_SCALE (4) times larger with
# nearest-neighbor, one art pixel = 4 world px like the tiles, so the browser
# draws the mask at its own size and never smooths it


def main() -> None:
    ap = argparse.ArgumentParser(description="Make game object sprites with Gemini + image_pixelizer.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("make", help="name (+ reference image) -> public/img/<name>.webp + its objects.ts entry")
    m.add_argument("name", help="object name: the file name and the catalog key, e.g. tree")
    m.add_argument("--ref", help="reference image (png / jpg / webp); left out, Gemini draws from the name alone")  # --ref: **required** -> **optional**, mechanism: no reference = text-only request
    m.add_argument("-w", "--width", type=int, default=32, help="sprite width in pixels (default 32)")  # default: **64** -> **32**, mechanism: half the art pixels, drawn twice as big
    m.add_argument("-c", "--colors", type=int, default=16, help="palette size (default 16)")
    m.add_argument("--scale", type=int, default=8, help="world px per sprite pixel in the printed entry (default 8)")  # default: **4** -> **8**, mechanism: 32 px * 8 = 256 world px, the same size as 64 px * 4
    m.add_argument("--background", choices=list(BACKGROUNDS), default="magenta", help="what Gemini is asked to paint behind the object (default magenta)")
    m.add_argument("--bg-tol", type=int, default=12, help="color tolerance when removing a painted background (default 12)")
    m.add_argument("--max-kb", type=float, default=20, help="largest allowed webp file in KB (default 20)")
    m.add_argument("--force", action="store_true", help="ignore the cache")
    m.set_defaults(func=make)
    t = sub.add_parser("tile", help="material name -> public/img/bg/<material>.webp, a seamless ground tile")
    t.add_argument("material", help="ground material: the file name, e.g. sand")
    t.add_argument("--notes", default="", help="extra words for the prompt, e.g. 'wet, darker'")
    t.add_argument("-w", "--width", type=int, default=32, help="tile size in pixels before mirroring; the file is twice this (default 32)")
    t.add_argument("-c", "--colors", type=int, default=8, help="palette size (default 8)")
    t.add_argument("--max-kb", type=float, default=20, help="largest allowed webp file in KB (default 20)")
    t.add_argument("--force", action="store_true", help="ignore the cache")
    t.set_defaults(func=tile)
    g = sub.add_parser("merge", help="-> public/img/bg/merge.webp, the mask for the border between two ground sections")
    g.add_argument("--seed", type=int, default=1, help="seed of the shape; another seed gives another border (default 1)")
    g.add_argument("-w", "--width", type=int, default=256, help="strip width in art pixels; the file is 4x this (default 256)")
    g.add_argument("--rows", type=int, default=40, help="strip height in art pixels; the file is 4x this (default 40)")
    g.add_argument("--max-kb", type=float, default=20, help="largest allowed webp file in KB (default 20)")
    g.set_defaults(func=merge)
    # tile takes no --ref and no --scale: the ground is drawn by CSS
    # background-size in gameScene.tsx, not by an ObjectDef
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
