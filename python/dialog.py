"""Dialog scenes: python dialog.py write "<idea>" --speakers A,B | render dialogs/<scene>.yaml | render ../src/components/Game/npcs/dialogs/<npc>.json"""

import argparse
import json
import re
from pathlib import Path

import gemini_tts as g

DIALOGS_DIR = g.ROOT / "dialogs"


def yaml():
    try:
        import yaml as y
    except ImportError:
        g.die("missing packages — run: pip install -r requirements.txt")
    return y
# lazy like the SDK imports, so a missing PyYAML is one clear line


def validate(scene: dict, src: str) -> None:
    if not isinstance(scene, dict) or not isinstance(scene.get("lines"), list) or not scene["lines"]:
        g.die(f"{src}: expected a mapping with a non-empty 'lines' list")
    for i, line in enumerate(scene["lines"], 1):
        if not isinstance(line, dict) or not str(line.get("speaker", "")).strip() or not str(line.get("text", "")).strip():
            g.die(f"{src}: line {i} needs 'speaker' and 'text'")
        extra = set(line) - {"speaker", "text", "style"}
        if extra:
            g.die(f"{src}: line {i} has unknown keys {sorted(extra)} (allowed: speaker, text, style)")
    voices = scene.get("voices") or {}
    if not isinstance(voices, dict):
        g.die(f"{src}: 'voices' must map speaker -> prebuilt voice")
    for spk, v in voices.items():
        if v not in g.PREBUILT:
            g.die(f"{src}: voices.{spk} = '{v}' is not a prebuilt voice ({', '.join(sorted(g.PREBUILT))})")
# the scene schema: lines [{speaker, text, style?}] plus an optional
# voices map for speakers that aren't in voices.json


def resolve_voices(scene: dict, src: str) -> dict[str, str]:
    registry = g.load_voices()
    mapped = scene.get("voices") or {}
    out = {}
    for spk in dict.fromkeys(l["speaker"] for l in scene["lines"]):
        entry = g.find_voice(registry, spk)
        if entry:
            if not entry.get("voice_id"):
                g.die(f"voice '{spk}' is not created yet — run: python voice.py create {spk} --from voices.json")
            out[spk] = entry["voice_id"]
        elif spk in mapped:
            out[spk] = mapped[spk]
        elif spk in g.PREBUILT:
            out[spk] = spk
        else:
            g.die(f"{src}: no voice for speaker '{spk}' — add it to voices.json, "
                  f"or map it under 'voices:' to a prebuilt voice")
    return out
# speaker -> voice, in order: custom voice from voices.json, the scene's
# voices map, then the speaker name itself if it's a prebuilt voice


# ---------- npc files ----------

CONDITION = re.compile(r"^(greeting|default|spoken|quest|questCleared|retry|level\d+-(start|clear|fail))$")


def is_npc(scene) -> bool:
    return isinstance(scene, dict) and "npc" in scene and "dialog" in scene


def validate_npc(script: dict, src: str) -> None:
    extra = set(script) - {"npc", "name", "color", "kana", "dialog"}
    if extra:
        g.die(f"{src}: unknown keys {sorted(extra)} (allowed: npc, name, color, kana, dialog)")
    for key in ("npc", "name", "color"):
        if not str(script.get(key, "")).strip():
            g.die(f"{src}: needs '{key}'")
    if not isinstance(script["dialog"], list) or not script["dialog"]:
        g.die(f"{src}: 'dialog' must be a non-empty list")
    for i, entry in enumerate(script["dialog"], 1):
        if not isinstance(entry, dict):
            g.die(f"{src}: dialog {i} must be a mapping")
        extra = set(entry) - {"condition", "choices", "lines"}
        if extra:
            g.die(f"{src}: dialog {i} has unknown keys {sorted(extra)} (allowed: condition, choices, lines)")
        labels = entry.get("condition")
        labels = labels if isinstance(labels, list) else [labels]
        for label in labels:
            if not isinstance(label, str) or not CONDITION.match(label):
                g.die(f"{src}: dialog {i} has unknown condition '{label}' (greeting, default, spoken, quest, "
                      f"questCleared, retry, level<N>-start, level<N>-clear, level<N>-fail)")
        for c in entry.get("choices") or []:
            if not isinstance(c, list) or len(c) != 2:
                g.die(f"{src}: dialog {i} choices must be [kana, en] pairs")
        if not isinstance(entry.get("lines"), list) or not entry["lines"]:
            g.die(f"{src}: dialog {i} needs a non-empty 'lines' list")
        for j, line in enumerate(entry["lines"], 1):
            where = f"{src}: dialog {i} line {j}"
            if not isinstance(line, dict) or not str(line.get("kana", "")).strip() or not str(line.get("en", "")).strip():
                g.die(f"{where} needs 'kana' and 'en'")
            extra = set(line) - {"kana", "text", "en", "style"}
            if extra:
                g.die(f"{where} has unknown keys {sorted(extra)} (allowed: kana, text, en, style)")
            for piece in pieces(line.get("text")):
                if "{target}" in str(line.get("text")) and len(g.audio_name(piece)) <= 2:
                    g.die(f"{where}: the piece '{piece}' next to {{target}} is too short, its mp3 would replace "
                          f"a kana clip — reword 'text' so each piece is a phrase")
# the schema of src/components/Game/npcs/dialogs/<npc>.json, the file the
# /make-dialog skill writes and toNPCProps.ts reads. CONDITION is the same
# label pattern as the Condition type in dialogBubble.tsx


def pieces(text) -> list[str]:
    return [p.strip() for p in str(text or "").split("{target}") if p.strip()]
# the parts of a line's text that are rendered: the whole text, or, when it
# holds {target}, what is before and after it. {target} itself is not
# rendered: the game plays the kana's own clip (<kana>.mp3) in its place.
# Same cut as clipsOf in toNPCProps.ts


def npc_scene(script: dict) -> dict:
    lines = {}
    for entry in script["dialog"]:
        for line in entry["lines"]:
            for text in pieces(line.get("text")):
                lines.setdefault(text, {"speaker": script["npc"], "text": text,
                                        **({"style": line["style"]} if line.get("style") else {})})
    if not lines:
        g.die(f"npc '{script['npc']}' has no line with 'text', nothing to render")
    return {"scene": script["npc"], "lines": list(lines.values())}
# an npc file as a scene: one line per different 'text' (the first style
# wins), spoken by the npc. Lines with no 'text' are silent in the game and
# are skipped; a text with {target} gives one line per piece (see pieces). render() then treats it like any scene yaml


# ---------- write ----------

def slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return s[:40].strip("_") or "scene"


def write(args) -> None:
    speakers = [s.strip() for s in args.speakers.split(",") if s.strip()]
    if not speakers:
        g.die("--speakers needs at least one name, e.g. --speakers jordi,kaito")
    registry = g.load_voices()
    cast = []
    for s in speakers:
        entry = g.find_voice(registry, s)
        if entry:
            cast.append(f"- {s}: custom voice. Profile: {json.dumps(entry['profile'], ensure_ascii=False)}")
        elif s in g.PREBUILT:
            cast.append(f"- {s}: prebuilt voice ({g.PREBUILT[s]})")
        else:
            cast.append(f"- {s}: no voice yet — pick a prebuilt voice that fits and contrasts with the others, "
                        f"and put it in the top-level 'voices' map")
    out = Path(args.out) if args.out else DIALOGS_DIR / f"{slug(args.idea)}.yaml"
    if out.exists() and not args.force:
        g.die(f"{out} already exists — use --out or --force")

    system = f"""You write short spoken dialog scenes for a Japanese-learning game aimed at absolute beginners.
Output ONLY YAML (no code fences, no commentary) in this exact shape:

scene: <snake_case_name>
voices:            # only for speakers marked "no voice yet"; omit the key otherwise
  <speaker>: <prebuilt voice name>
lines:
  - speaker: <name>
    text: <Japanese line>
    style: <short English mood/delivery note, optional>

Rules:
- Write exactly {args.lines} lines. Use only these speaker names: {', '.join(speakers)}.
- Casual, natural Japanese a beginner can follow: short sentences, mostly hiragana, common words.
- 'text' is spoken verbatim: no romaji, no translations, no stage directions inside it.
- 'style' is only the situational mood (e.g. "excited", "teasing, quiet"). Never put age, gender or accent in it.
- Let each speaker's personality show.
- Prebuilt voices to choose from (name: character): {', '.join(f'{k}: {v}' for k, v in g.PREBUILT.items())}

Cast:
{chr(10).join(cast)}"""

    reply = g.generate_text(system, f"Scene idea: {args.idea}", args.model)
    reply = re.sub(r"^```(?:ya?ml)?\s*|\s*```\s*$", "", reply.strip())
    try:
        scene = yaml().safe_load(reply)
    except yaml().YAMLError as e:
        g.die(f"the model's reply wasn't valid YAML ({e}); try again")
    validate(scene, "model reply")
    unknown = {l["speaker"] for l in scene["lines"]} - set(speakers)
    if unknown:
        g.die(f"model reply used speakers not in --speakers: {sorted(unknown)}; try again")
    unvoiced = [s for s in speakers if not g.find_voice(registry, s) and s not in g.PREBUILT
                and s not in (scene.get("voices") or {})]
    if unvoiced:
        g.die(f"model reply didn't assign a prebuilt voice to {unvoiced}; try again")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(yaml().safe_dump(scene, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print(f"wrote {out.relative_to(g.ROOT) if out.is_relative_to(g.ROOT) else out} ({len(scene['lines'])} lines)")
    for l in scene["lines"]:
        print(f"  {l['speaker']}: {l['text']}" + (f"  ({l['style']})" if l.get("style") else ""))
# asks gemini-3.8-flash for the YAML with the cast's profiles in the system
# prompt, strips any ``` fences, and only writes the file once it parses and
# passes the scene schema, uses only the given speakers, and every speaker
# without a custom or prebuilt voice got one in the voices map


# ---------- render ----------

def render(args) -> None:
    path = Path(args.scene)
    if not path.exists():
        g.die(f"{path} not found")
    scene = yaml().safe_load(path.read_text(encoding="utf-8"))
    if is_npc(scene):
        validate_npc(scene, str(path))
        scene = npc_scene(scene)
        args.per_line = True
    # an npc json (JSON is valid yaml, so safe_load reads it) is turned into
    # a scene first. Every line needs its own game file, so it is rendered
    # line by line
    validate(scene, str(path))
    voices = resolve_voices(scene, str(path))
    lines = [{"speaker": l["speaker"], "text": str(l["text"]).strip(), "style": (l.get("style") or None)}
             for l in scene["lines"]]
    g.need_ffmpeg()
    out = g.OUTPUT_DIR / f"{path.stem}.mp3"
    calls = hits = 0
    saved: list[Path] = []

    if not args.per_line and len(voices) <= 2 and all(v in g.PREBUILT for v in voices.values()):  # multi: **always when eligible** -> **unless --per-line**, mechanism: one multi-speaker clip can't be cut into the game's per-line files, so --per-line forces the turn-by-turn path
        f = g.cached(g.cache_key("multi", voices, lines, args.model))
        if f.exists() and not args.force:
            hits = len(lines)
        else:
            f.write_bytes(g.tts_multi(lines, voices, args.model))
            calls = 1
        g.join_to_mp3([f.read_bytes()], out)
        mode = "multi-speaker (1 request)"
    # every voice prebuilt and at most 2 speakers: the whole scene in one
    # request, cached as one clip keyed on the full scene
    else:
        wavs = []
        for i, l in enumerate(lines, 1):
            f = g.cached(g.cache_key(voices[l["speaker"]], l["text"], l["style"], args.model))
            if f.exists() and not args.force:
                hits += 1
            else:
                print(f"  [{i}/{len(lines)}] {l['speaker']}: {l['text']}")
                f.write_bytes(g.tts(voices[l["speaker"]], l["text"], l["style"], args.model))
                calls += 1
            wavs.append(f.read_bytes())
            saved.append(g.line_mp3(l["speaker"], l["text"]))
            g.join_to_mp3([wavs[-1]], saved[-1])
        g.join_to_mp3(wavs, out, args.pause_ms)
        mode = f"turn by turn, {args.pause_ms} ms pauses"
    # otherwise one request per line, each cached on (voice, text, style,
    # model), so editing one line re-renders only that line. Each line is
    # also saved for the game as public/dialog/<speaker>/<line>.mp3

    print(f"{len(lines)} lines, {calls} API calls, {hits} cached — {mode}")
    for p in dict.fromkeys(saved):
        print(f"-> {p.relative_to(g.ROOT.parent)}")
    print(f"-> {out.relative_to(g.ROOT)} (whole scene, preview)")
    if not saved:
        print("   (multi-speaker audio can't be split into per-line game files — add --per-line)")


def main() -> None:
    ap = argparse.ArgumentParser(description="Write and render dialog scenes with Gemini.")
    sub = ap.add_subparsers(dest="cmd", required=True)
    w = sub.add_parser("write", help="draft a scene YAML with gemini-3.8-flash")
    w.add_argument("idea")
    w.add_argument("--speakers", required=True, help="comma-separated, e.g. jordi,kaito")
    w.add_argument("--lines", type=int, default=6)
    w.add_argument("--out", help="default: dialogs/<slug of idea>.yaml")
    w.add_argument("--force", action="store_true", help="overwrite an existing file")
    w.add_argument("--model", default=g.TEXT_MODEL)
    w.set_defaults(func=write)
    r = sub.add_parser("render", help="render a scene YAML or an npc json: per-line mp3s to public/dialog/<speaker>/, whole scene to output/<scene>.mp3")
    r.add_argument("scene")
    r.add_argument("--per-line", action="store_true",
                   help="skip the multi-speaker request so every line gets its own game file")
    r.add_argument("--pause-ms", type=int, default=350)
    r.add_argument("--force", action="store_true", help="ignore the cache")
    r.add_argument("--model", default=g.TTS_MODEL)
    r.set_defaults(func=render)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
