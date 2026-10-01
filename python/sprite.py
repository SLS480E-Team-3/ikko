"""Make a game object sprite: reference image -> Gemini redraw (front,
top-down 45 degrees) -> image_pixelizer -> public/img/<name>.webp, plus the
ObjectDef entry for src/components/Game/Object/objects.ts."""

import argparse
import hashlib
import io
from pathlib import Path

from gemini_tts import CACHE_DIR, OUTPUT_DIR, ROOT, client, die
# reuses the TTS toolkit's client(): it loads GEMINI_API_KEY from python/.env,
# so sprites need no key setup of their own. Paths hang off ROOT, so the
# script works from any cwd

IMG_DIR = ROOT.parent / "public" / "img"
IMAGE_MODEL = "gemini-3.1-flash-image"
# IMG_DIR is where the game reads sprites from (ObjectDef.sprite.src =
# '/img/<name>.webp'). The model is "Nano Banana 2" in client().models.list()

PROMPT = (
    "Redraw the {name} from the reference image as a single game object sprite. "
    "Camera: in front of the object, looking down at it from about 45 degrees "
    "(3/4 top-down view, like a classic top-down RPG), so its front and its top are both visible. "
    "Show the whole object, centered, standing upright, nothing cropped. "
    "Flat simple colors with clear dark outlines, no text, no ground, no cast shadow, no other objects. "
    "Background: {background}."
)
BACKGROUNDS = {
    "transparent": "fully transparent",
    "magenta": "one flat solid magenta color (#FF00FF) with no gradient and no pattern",
}
# one fixed prompt, so every object comes out in the same view and style.
# "magenta" is the default: asked for "transparent", the model paints a
# checkerboard instead of real alpha, which can't be removed; a flat magenta
# can be keyed out in cut_out below

HITBOX_FRAC = 0.2
# share of the sprite's height, measured from the bottom, that blocks the
# player. The view is 45 degrees from above, so only the base is on the
# ground; everything above it is drawn over and can be walked behind


def generate(name: str, ref: Path, background: str, force: bool) -> bytes:
    data = ref.read_bytes()
    prompt = PROMPT.format(name=name, background=BACKGROUNDS[background])
    key = hashlib.sha256(data + prompt.encode() + IMAGE_MODEL.encode()).hexdigest()[:16]
    cached = CACHE_DIR / f"sprite_{key}.png"
    if cached.exists() and not force:
        print(f"cached: {cached.name}")
        return cached.read_bytes()
    from google.genai import types
    from PIL import Image
    mime = Image.MIME.get(Image.open(io.BytesIO(data)).format or "", "image/png")
    try:
        res = client().models.generate_content(
            model=IMAGE_MODEL,
            contents=[types.Part.from_bytes(data=data, mime_type=mime), prompt],
        )
    except Exception as e:
        die(f"Gemini image request failed: {e}")
    parts = (res.candidates[0].content.parts if res.candidates and res.candidates[0].content else None) or []
    for part in parts:
        if part.inline_data and part.inline_data.data:
            CACHE_DIR.mkdir(exist_ok=True)
            cached.write_bytes(part.inline_data.data)
            return part.inline_data.data
    die("Gemini returned no image (the request may have been blocked) — try another reference")
# one API call per (reference bytes, prompt, model): the raw image is stored
# in .cache/ under that hash, so changing -w / -c / --scale re-runs only the
# local steps. The reference's mime type is read from the file itself, not
# its extension


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
    ref = Path(args.ref)
    if not ref.is_file():
        die(f"reference image not found: {ref}")
    raw = generate(args.name, ref, args.background, args.force)
    OUTPUT_DIR.mkdir(exist_ok=True)
    (OUTPUT_DIR / f"{args.name}_raw.png").write_bytes(raw)
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
    # --max-kb, so an oversized sprite never lands in public/img. A 64 px wide,
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
# Gemini image is copied to output/ to compare against


def main() -> None:
    ap = argparse.ArgumentParser(description="Make game object sprites with Gemini + image_pixelizer.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("make", help="reference image -> public/img/<name>.webp + its objects.ts entry")
    m.add_argument("name", help="object name: the file name and the catalog key, e.g. tree")
    m.add_argument("--ref", required=True, help="reference image (png / jpg / webp)")
    m.add_argument("-w", "--width", type=int, default=64, help="sprite width in pixels (default 64)")
    m.add_argument("-c", "--colors", type=int, default=16, help="palette size (default 16)")
    m.add_argument("--scale", type=int, default=4, help="world px per sprite pixel in the printed entry (default 4)")
    m.add_argument("--background", choices=list(BACKGROUNDS), default="magenta", help="what Gemini is asked to paint behind the object (default magenta)")
    m.add_argument("--bg-tol", type=int, default=12, help="color tolerance when removing a painted background (default 12)")
    m.add_argument("--max-kb", type=float, default=20, help="largest allowed webp file in KB (default 20)")
    m.add_argument("--force", action="store_true", help="ignore the cache")
    m.set_defaults(func=make)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
