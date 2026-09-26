"""Shared helpers for voice.py and dialog.py: Gemini client, TTS calls,
Voice design, error messages, the line cache and ffmpeg."""

import base64
import contextlib
import functools
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VOICES_FILE = ROOT / "voices.json"
OUTPUT_DIR = ROOT / "output"
CACHE_DIR = ROOT / ".cache"
DIALOG_DIR = ROOT.parent / "public" / "dialog"
# paths hang off this file, not the cwd, so the scripts work from anywhere.
# DIALOG_DIR is the game's audio root: NPCRenderer plays
# /dialog/<voice>/<file>.mp3, so a voice's lines go in public/dialog/<name>/

TTS_MODEL = "gemini-3.8-flash-tts"
TEXT_MODEL = "gemini-3.8-flash"
SAMPLE_RATE = 24000
# model names from the speech-generation / text-generation docs. TTS returns
# 24 kHz mono 16-bit WAV for unary requests

PREBUILT = {
    "Zephyr": "Bright", "Puck": "Upbeat", "Charon": "Informative",
    "Kore": "Firm", "Fenrir": "Excitable", "Leda": "Youthful",
    "Orus": "Firm", "Aoede": "Breezy", "Callirrhoe": "Easy-going",
    "Autonoe": "Bright", "Enceladus": "Breathy", "Iapetus": "Clear",
    "Umbriel": "Easy-going", "Algieba": "Smooth", "Despina": "Smooth",
    "Erinome": "Clear", "Algenib": "Gravelly", "Rasalgethi": "Informative",
    "Laomedeia": "Upbeat", "Achernar": "Soft", "Alnilam": "Firm",
    "Schedar": "Even", "Gacrux": "Mature", "Pulcherrima": "Forward",
    "Achird": "Friendly", "Zubenelgenubi": "Casual", "Vindemiatrix": "Gentle",
    "Sadachbia": "Lively", "Sadaltager": "Knowledgeable", "Sulafat": "Warm",
}
# the 30 prebuilt voices and their one-word character from the docs. Only
# these can go in a multi-speaker request

PROFILE_FIELDS = [
    "language", "accent", "gender", "age", "personality", "timbre", "energy",
    "pitch", "pitch_range", "speed", "volume", "articulation", "register",
    "pauses", "use_case",
]

LANGUAGE_CODES = {"japanese": "ja-JP", "english": "en-US"}


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)
# every user-facing failure goes through here: one line, exit code 1


# ---------- client + errors ----------

@functools.cache  # client: **new Client per call** -> **one cached Client**, mechanism: `client().voices.create(...)` left the Client unreferenced, so it was garbage-collected and closed its httpx connection before the request was sent; caching keeps it alive for the whole run
def client():
    try:
        from dotenv import load_dotenv
        from google import genai
    except ImportError:
        die("missing packages — run: pip install -r requirements.txt")
    load_dotenv(ROOT / ".env")
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key or key == "your-key-here":
        die("GEMINI_API_KEY not set — copy .env.example to .env and paste your key")
    return genai.Client(api_key=key)
# imports are lazy so `voice.py list` works before pip install. The key is
# read from python/.env and handed straight to the SDK; it's never printed


@contextlib.contextmanager
def api_errors(what: str):
    try:
        from google.genai import errors
    except ImportError:
        die("missing packages — run: pip install -r requirements.txt")
    try:
        from google.genai._gaos.lib import compat_errors
        caught = (errors.APIError, compat_errors.APIError)
    except ImportError:
        caught = (errors.APIError,)
    # caught: **errors.APIError** -> **+ compat_errors.APIError**, mechanism: client.voices / client.interactions raise the SDK's separate _gaos error tree (BadRequestError etc.), which doesn't subclass errors.APIError, so it escaped as a raw traceback
    try:
        yield
    except caught as e:
        code = getattr(e, "code", None) or getattr(e, "status_code", None) or 0  # code: **e.code** -> **e.code or e.status_code**, mechanism: the _gaos errors carry the HTTP status as status_code
        if code == 0 and "connection" in type(e).__name__.lower():
            die(f"{what}: couldn't reach the Gemini API — check your internet connection")
        # no status + APIConnectionError/APITimeoutError = network, not the API
        msg = _redact(str(getattr(e, "message", None) or e))
        low = msg.lower()
        if "api key" in low or code in (401, 403):
            hint = "bad or unauthorized GEMINI_API_KEY — check python/.env"
        elif code == 429:
            hint = "quota or rate limit hit — wait and retry, or check your plan's limits"
        elif code == 404:
            hint = "model or voice not found — check the model name / voice_id"
        elif code == 400:
            hint = "request rejected (unsupported or invalid field)"
        elif code >= 500:
            hint = "Gemini server error — retry in a moment"
        else:
            hint = "API error"
        die(f"{what}: {hint} [{code}] {msg}")
    except TypeError as e:
        die(f"{what}: unsupported field for this google-genai version ({e}) — "
            "run: pip install -U -r requirements.txt")
# maps SDK errors to one clear line. Gemini reports a bad key as 400 "API key
# not valid", so the message text is checked before the code. TypeError =
# the installed SDK doesn't know a field (e.g. client.voices before 2.25.0)


def _redact(text: str) -> str:
    key = os.environ.get("GEMINI_API_KEY", "")
    return text.replace(key, "***") if key else text
# belt and braces: an error message must never echo the key


# ---------- API calls ----------

def _audio(interaction) -> bytes:
    out = getattr(interaction, "output_audio", None)
    if not out or not out.data:
        die("the model returned no audio (the text may have been blocked or empty)")
    return base64.b64decode(out.data)


def tts(voice: str, text: str, style: str | None = None, model: str = TTS_MODEL) -> bytes:
    part = {"type": "text", "text": text}
    if style:
        part["annotations"] = [{"type": "speech_metadata", "style": style}]
    with api_errors(f"TTS ({voice})"):
        it = client().interactions.create(
            model=model,
            input=[{"type": "user_input", "content": [part]}],
            response_format={"type": "audio"},
            generation_config={"speech_config": [{"voice": voice}]},
        )
    return _audio(it)
# one line, one voice (prebuilt name or voice_...). The shape is the docs'
# single-speaker example; style rides in speech_metadata, never in the text


def tts_multi(turns: list[dict], speakers: dict[str, str], model: str = TTS_MODEL) -> bytes:
    content = []
    for t in turns:
        meta = {"type": "speech_metadata", "speaker": t["speaker"]}
        if t.get("style"):
            meta["style"] = t["style"]
        content.append({"type": "text", "text": t["text"], "annotations": [meta]})
    with api_errors("multi-speaker TTS"):
        it = client().interactions.create(
            model=model,
            input=[{"type": "user_input", "content": content}],
            response_format={"type": "audio"},
            generation_config={"speech_config": {
                "mode": "conversational",
                "speakers": [{"speaker": s, "voice": v} for s, v in speakers.items()],
            }},
        )
    return _audio(it)
# the whole scene in one request: every turn names its speaker, and the
# config maps up to 2 speakers to prebuilt voices (docs' conversational mode)


def build_description(p: dict) -> str:
    return (
        f"A {p['age']}-year-old {p['gender']} {p['use_case']} voice speaking "
        f"{p['language']} with a {p['accent']} accent; {p['personality']}. "
        f"Timbre: {p['timbre']}; energy: {p['energy']}; pitch: {p['pitch']}; "
        f"pitch range: {p['pitch_range']}; speed: {p['speed']}; volume: {p['volume']}; "
        f"articulation: {p['articulation']}; register: {p['register']}; pauses: {p['pauses']}."
    )
# the Voice design prompt: permanent traits only (who they are + how they
# sound), as the docs' "be specific and concise" tip suggests. The sound
# traits are "label: value" pairs so any free-text value reads cleanly


def language_code(language: str) -> str:
    return LANGUAGE_CODES.get(language.strip().lower(), language.strip())
# "Japanese" -> "ja-JP"; anything else is passed through as a BCP-47 code


def design_voice(name: str, profile: dict, description: str, model: str = TTS_MODEL):
    with api_errors("Voice design"):
        v = client().voices.create(store=True, voice={
            "model": model,
            "type": "prompted",
            "display_name": name,
            "gender": profile["gender"].strip().lower(),
            "language_code": language_code(profile["language"]),
            "prompted": {"input": description},
        })
    sample = base64.b64decode(v.sample_audio.data) if v.sample_audio and v.sample_audio.data else None
    return v.id, sample
# voices.create with type "prompted" + store=True (docs' Voice design
# example): returns a persistent voice_... id and a WAV preview


def generate_text(system: str, prompt: str, model: str = TEXT_MODEL) -> str:
    with api_errors("text generation"):
        it = client().interactions.create(model=model, system_instruction=system, input=prompt)
    return it.output_text or ""


# ---------- voices.json ----------

def load_voices() -> dict:
    if not VOICES_FILE.exists():
        return {"voices": []}
    return json.loads(VOICES_FILE.read_text(encoding="utf-8"))


def save_voices(data: dict) -> None:
    VOICES_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_voice(data: dict, name: str) -> dict | None:
    return next((v for v in data["voices"] if v["name"].lower() == name.lower()), None)


# ---------- cache ----------

def cache_key(*parts) -> str:
    return hashlib.sha256(json.dumps(parts, ensure_ascii=False).encode()).hexdigest()


def cached(key: str) -> Path:
    CACHE_DIR.mkdir(exist_ok=True)
    return CACHE_DIR / f"{key}.wav"
# a rendered line is stored as .cache/<sha256>.wav, keyed on everything that
# changes the audio (voice id, text, style, model), so an unchanged line is
# never sent to the API again


# ---------- game audio paths ----------

def audio_name(text: str) -> str:
    name = "".join(ch for ch in text if ch not in "！!、,〜~。.／/\\ 　\n")
    return name or "line"


def line_mp3(voice_name: str, text: str) -> Path:
    return DIALOG_DIR / voice_name / f"{audio_name(text)}.mp3"
# a line's mp3 in the game's layout: public/dialog/<voice name>/<line>.mp3.
# The file name follows npcs.ts: the line with ！ 、 〜 (and 。, spaces,
# slashes) dropped and ？ kept, so the third item of a say() line matches it


# ---------- ffmpeg ----------

def need_ffmpeg() -> None:
    if not shutil.which("ffmpeg"):
        die("ffmpeg not found — install it with: brew install ffmpeg")


def join_to_mp3(wavs: list[bytes], out: Path, pause_ms: int = 0) -> None:
    need_ffmpeg()
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        args, labels = [], []
        for i, wav in enumerate(wavs):
            if i and pause_ms:
                args += ["-f", "lavfi", "-t", f"{pause_ms / 1000}",
                         "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono"]
                labels.append(len(labels))
            f = Path(tmp) / f"{i}.wav"
            f.write_bytes(wav)
            args += ["-i", str(f)]
            labels.append(len(labels))
        chain = "".join(f"[{n}:a]aformat=sample_rates={SAMPLE_RATE}:channel_layouts=mono[a{n}];" for n in labels)
        chain += "".join(f"[a{n}]" for n in labels) + f"concat=n={len(labels)}:v=0:a=1[out]"
        cmd = ["ffmpeg", "-y", "-loglevel", "error", *args,
               "-filter_complex", chain, "-map", "[out]", "-codec:a", "libmp3lame", "-q:a", "2", str(out)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            die(f"ffmpeg failed: {r.stderr.strip()}")
# wav clips (with a generated silence input between each pair) are
# normalised to 24 kHz mono and concatenated into one mp3. A single clip
# is just a wav -> mp3 conversion
