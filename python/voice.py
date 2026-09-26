"""Custom voices: python voice.py create <name> [--from file.json] | list"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import gemini_tts as g

SAMPLE_LINE_PROPMT = "Hello, my name is {name}. I'm {age} years old. よろしく!"
SAMPLE_SYSTEM = ("You write one short spoken self-introduction in natural Japanese for a game "
                 "character. Stay in character: match the accent, register and personality in the "
                 "profile. Output only the Japanese line, no romaji, translation or quotes.")
# SAMPLE_LINE_PROPMT is a prompt, not the spoken text: gemini-3.8-flash turns
# it into a Japanese introduction in the voice's own register (e.g. Kansai-ben
# for shuto), and that line is what _sample.mp3 says


def read_profile_file(path: str, name: str) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if "voices" in data:
        entry = g.find_voice(data, name)
        if not entry:
            g.die(f"no voice named '{name}' in {path}")
        data = entry["profile"]
    elif "profile" in data:
        data = data["profile"]
    missing = [f for f in g.PROFILE_FIELDS if not str(data.get(f, "")).strip()]
    if missing:
        g.die(f"{path} is missing profile fields: {', '.join(missing)}")
    return {f: str(data[f]) for f in g.PROFILE_FIELDS}
# --from accepts a voices.json-shaped file (picks the entry by name), a single
# entry ({"profile": {...}}) or a flat profile; all 15 fields are required


def ask_profile(defaults: dict) -> dict:
    print("Enter the voice profile (Enter keeps the [default]):")
    profile = {}
    for f in g.PROFILE_FIELDS:
        d = defaults.get(f, "")
        while True:
            v = input(f"  {f}{f' [{d}]' if d else ''}: ").strip() or str(d)
            if v:
                break
            print("    required")
        profile[f] = v
    return profile
# interactive path: one prompt per field, prefilled from voices.json if the
# voice already exists there


def create(args) -> None:
    g.need_ffmpeg()
    data = g.load_voices()
    entry = g.find_voice(data, args.name)
    profile = read_profile_file(args.from_file, args.name) if args.from_file \
        else ask_profile(entry["profile"] if entry else {})
    description = g.build_description(profile)
    print(f"description: {description}")

    voice_id, _ = g.design_voice(args.name, profile, description, args.model)  # sample: **kept the API preview** -> **dropped**, mechanism: Voice design's preview has a fixed script, so _sample.mp3 is rendered below from SAMPLE_LINE instead
    print(f"created voice {voice_id}")

    if not entry:
        entry = {"name": args.name}
        data["voices"].append(entry)
    entry.update(profile=profile, description=description, voice_id=voice_id,
                 model=args.model, created=datetime.now(timezone.utc).isoformat(timespec="seconds"))
    g.save_voices(data)
    print(f"saved to {g.VOICES_FILE.name}")
    # saved before the sample render, so a failed render doesn't lose the voice

    prompt = SAMPLE_LINE_PROPMT.format(name=args.name, age=profile["age"])
    text = g.generate_text(SAMPLE_SYSTEM, f"Profile: {json.dumps(profile, ensure_ascii=False)}\n"
                           f"Say this in Japanese: {prompt}").strip()  # text: **SAMPLE_LINE spoken as-is (English)** -> **Japanese line written from SAMPLE_LINE_PROPMT**, mechanism: the text model gets the filled prompt plus the profile and returns one Japanese line, which the new voice then speaks
    print(f"sample line: {text}")
    f = g.cached(g.cache_key(voice_id, text, None, args.model))
    if not f.exists():
        f.write_bytes(g.tts(voice_id, text, model=args.model))
    out = g.DIALOG_DIR / args.name / "_sample.mp3"
    g.join_to_mp3([f.read_bytes()], out)
    print(f"sample -> {out.relative_to(g.ROOT.parent)}")
# profile -> description -> Voice design -> voices.json -> _sample.mp3 intro.
# ffmpeg is checked up front so a missing install fails before spending a
# voice slot (200 per project)


def list_voices(_args) -> None:
    voices = g.load_voices()["voices"]
    if not voices:
        print("no voices yet — python voice.py create <name>")
        return
    rows = [("name", "voice_id", "gender", "age", "pitch", "energy", "use_case")]
    for v in voices:
        p = v.get("profile", {})
        rows.append((v["name"], v.get("voice_id") or "not created", p.get("gender", ""),
                     str(p.get("age", "")), p.get("pitch", ""), p.get("energy", ""), p.get("use_case", "")))
    widths = [max(len(r[i]) for r in rows) for i in range(len(rows[0]))]
    for r in rows:
        print("  ".join(c.ljust(w) for c, w in zip(r, widths)).rstrip())
# reads voices.json only (no API call), so it works before pip install


def main() -> None:
    ap = argparse.ArgumentParser(description="Create and list Gemini custom voices.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("create", help="design a voice from a profile")
    c.add_argument("name")
    c.add_argument("--from", dest="from_file", metavar="FILE",
                   help="profile JSON (a flat profile, or voices.json to reuse an entry)")
    c.add_argument("--model", default=g.TTS_MODEL)
    c.set_defaults(func=create)
    sub.add_parser("list", help="show voices.json").set_defaults(func=list_voices)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
