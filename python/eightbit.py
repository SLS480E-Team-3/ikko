"""8-bit converter: python eightbit.py [mp3, mid or folder]... [--bits 8] [--rate 11025] [--out DIR] [--speed 1] [--transpose 0]"""

import argparse
import subprocess
from pathlib import Path

import mido
import numpy as np

import gemini_tts as g

WORK_RATE = 44100  # every file is resampled to this before crushing, so --rate means the same thing for any input
SUFFIX = "_8bit"
MIDI_EXT = {".mid", ".midi"}
DRUM_CH = 9  # MIDI channel 10, 0-based
BGM = Path(__file__).resolve().parent.parent / "public" / "BGM"
MIDI_DIR = BGM / "midi"  # default input when no paths are given
MIDI_OUT = BGM / "8bits"  # default output for MIDI renders
# paths hang off this file's location, so the defaults work from any cwd


def crush(src: Path, out: Path, bits: float, rate: int, mono: bool) -> None:
    samples = max(1, round(WORK_RATE / rate))
    chain = f"aresample={WORK_RATE},acrusher=bits={bits}:samples={samples}:mode=lin:mix=1:aa=0,aformat=sample_fmts=s16"  # chain: **acrusher → lame** -> **acrusher → s16 → lame**, mechanism: acrusher's float output can hold samples LAME's psymodel rejects (Pathétique hit an assert in calc_energy); converting to 16-bit int clamps them first
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-af", chain,
           *(["-ac", "1"] if mono else []), "-codec:a", "libmp3lame", "-q:a", "2", str(out)]
    out.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if r.returncode:
        g.die(f"ffmpeg failed on {src}: {r.stderr.strip()}")
# ffmpeg's acrusher does both halves of the 8-bit sound: bits= quantizes
# each sample to 2^bits levels (the gritty noise floor) and samples= holds
# every Nth sample (sample-and-hold, the aliased "low sample rate" fizz).
# mix=1 is fully wet and aa=0 keeps the hard steps instead of smoothing them


def load_notes(path: Path, speed: float, transpose: int) -> list[tuple[float, float, int, int, int]]:
    notes, held, t = [], {}, 0.0
    for msg in mido.MidiFile(path):
        t += msg.time / speed
        if msg.type not in ("note_on", "note_off"):
            continue
        key = (msg.channel, msg.note)
        if msg.type == "note_on" and msg.velocity > 0:
            held.setdefault(key, []).append((t, msg.velocity))
        elif held.get(key):
            start, vel = held[key].pop(0)
            pitch = msg.note if msg.channel == DRUM_CH else msg.note + transpose
            notes.append((start, t, pitch, vel, msg.channel))
    return notes
# iterating a MidiFile merges all tracks in time order and converts ticks to
# seconds through the tempo map, so msg.time is a delta in seconds. Each
# note_on waits in `held` until its note_off (or note_on with velocity 0),
# FIFO per (channel, note) so repeated notes pair up in order. Parts are told
# apart by channel, which works for both type 0 and type 1 files


def voices_for(notes: list) -> dict[int, tuple[str, float]]:
    pitches: dict[int, list[int]] = {}
    for _, _, pitch, _, ch in notes:
        pitches.setdefault(ch, []).append(pitch)
    melodic = sorted((ch for ch in pitches if ch != DRUM_CH), key=lambda ch: sum(pitches[ch]) / len(pitches[ch]))
    voices = {DRUM_CH: ("noise", 0.0)}
    if melodic:
        voices[melodic[0]] = ("triangle", 0.0)
    for i, ch in enumerate(reversed(melodic[1:])):
        voices[ch] = ("pulse", (0.5, 0.25, 0.125)[i % 3])
    return voices
# NES layout: the part with the lowest average pitch is the bass on the
# triangle, every other part gets a pulse wave. Duty cycles rotate from the
# highest part down (50% hollow, 25% bright, 12.5% thin) so parts that share
# a register still sound different. Channel 10 is always noise drums


def envelope(n_on: int, n_rel: int) -> np.ndarray:
    atk, dec = int(0.005 * WORK_RATE), int(0.06 * WORK_RATE)
    env = np.full(n_on + n_rel, 0.7)
    a = min(atk, n_on)
    env[:a] = np.linspace(0, 1, a, endpoint=False)
    d = min(dec, max(0, n_on - a))
    env[a:a + d] = np.linspace(1, 0.7, d, endpoint=False)
    env[n_on:] = np.linspace(env[n_on - 1] if n_on else 0.7, 0, n_rel)
    return env
# 5 ms attack to full, 60 ms decay to 70% sustain, then a release after the
# note ends. Short notes cut the attack/decay short instead of overrunning


def note_wave(kind: str, duty: float, pitch: int, n: int, rng: np.random.Generator) -> np.ndarray:
    if kind == "noise":
        return rng.choice((-1.0, 1.0), n)
    freq = 440.0 * 2 ** ((pitch - 69) / 12)
    phase = (np.arange(n) * freq / WORK_RATE) % 1.0
    if kind == "pulse":
        return np.where(phase < duty, 1.0, -1.0)
    tri = 4 * np.abs(phase - 0.5) - 1
    return np.round((tri + 1) * 7.5) / 7.5 - 1
# pulse: high while phase < duty, else low. triangle: folded ramp snapped to
# 16 steps like the NES's 4-bit triangle, which is what makes it buzz a bit.
# noise: random ±1 samples, the white-noise half of the NES noise channel


def render_midi(src: Path, out: Path, speed: float, transpose: int) -> None:
    notes = load_notes(src, speed, transpose)
    if not notes:
        g.die(f"no notes in {src}")
    voices = voices_for(notes)
    rel = int(0.04 * WORK_RATE)
    mix = np.zeros(int(max(n[1] for n in notes) * WORK_RATE) + rel + 1)
    rng = np.random.default_rng(0)
    for start, end, pitch, vel, ch in notes:
        kind, duty = voices[ch]
        s = int(start * WORK_RATE)
        if kind == "noise":
            n_on = int(WORK_RATE * (0.12 if pitch in (35, 36) else 0.1 if pitch in (38, 40) else 0.03))
            wave = note_wave(kind, duty, pitch, n_on, rng) * np.exp(-np.linspace(0, 6, n_on))
        else:
            n_on = max(1, int((end - start) * WORK_RATE))
            wave = note_wave(kind, duty, pitch, n_on + rel, rng) * envelope(n_on, rel)
        level = round(vel / 127 * 15) / 15
        gain = {"pulse": 0.5, "triangle": 1.0, "noise": 0.4}[kind]
        mix[s:s + len(wave)] += wave[: len(mix) - s] * level * gain
    peak = np.abs(mix).max() or 1.0
    pcm = (mix / peak * 0.9 * 32767).astype("<i2").tobytes()
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(WORK_RATE), "-ac", "1", "-i", "-",
           "-codec:a", "libmp3lame", "-q:a", "2", str(out)]
    out.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(cmd, input=pcm, capture_output=True, check=False)
    if r.returncode:
        g.die(f"ffmpeg failed on {src}: {r.stderr.decode().strip()}")
# every note is synthesized on its own and added into one float buffer at its
# start sample. Velocity is snapped to 16 volume levels (NES 4-bit volume);
# the triangle gets full gain because it's the quietest-sounding wave. Drums
# are fixed-length noise bursts with an exponential decay: kicks 120 ms,
# snares 100 ms, everything else (hats) 30 ms. The mix is normalized to a
# 0.9 peak, turned into 16-bit PCM and piped to ffmpeg's stdin for the mp3


def inputs(paths: list[str]) -> list[Path]:
    files = []
    for p in map(Path, paths):
        if p.is_dir():
            files += sorted(f for f in p.rglob("*") if f.suffix.lower() in {".mp3", *MIDI_EXT} and not f.stem.endswith(SUFFIX))
        elif p.is_file():
            files.append(p)
        else:
            g.die(f"not found: {p}")
    if not files:
        g.die("no mp3 or midi files found")
    return files
# a folder is walked recursively for .mp3s and .mid/.midi, skipping earlier outputs
# (*_8bit.mp3) so running it twice doesn't crush them again


def main() -> None:
    ap = argparse.ArgumentParser(description="Bitcrush mp3s, or render MIDI files as NES-style chiptune.")
    ap.add_argument("paths", nargs="*", default=[str(MIDI_DIR)], help="mp3 / mid files or folders (default: public/BGM/midi)")  # paths: **nargs="+"** -> **nargs="*" defaulting to public/BGM/midi**, mechanism: running with no arguments renders the whole MIDI folder
    ap.add_argument("--bits", type=float, default=8, help="bit depth, lower is grittier (default 8)")
    ap.add_argument("--rate", type=int, default=11025, help="effective sample rate in Hz, lower is fizzier (default 11025)")
    ap.add_argument("--out", help="output folder (default: public/BGM/8bits for MIDI, next to the input for mp3)")
    ap.add_argument("--stereo", action="store_true", help="keep stereo (default: mono, like old consoles)")
    ap.add_argument("--speed", type=float, default=1.0, help="MIDI only: tempo multiplier (default 1)")
    ap.add_argument("--transpose", type=int, default=0, help="MIDI only: shift melodic parts by semitones (default 0)")
    ap.add_argument("--force", action="store_true", help="overwrite existing outputs")
    a = ap.parse_args()
    if not 1 <= a.bits <= 64:
        g.die("--bits must be 1..64")
    if not WORK_RATE / 250 <= a.rate <= WORK_RATE:
        g.die(f"--rate must be {round(WORK_RATE / 250)}..{WORK_RATE}")
    g.need_ffmpeg()

    for src in inputs(a.paths):
        is_midi = src.suffix.lower() in MIDI_EXT
        out = (Path(a.out) if a.out else MIDI_OUT if is_midi else src.parent) / f"{src.stem}{SUFFIX}.mp3"  # out: **next to every input** -> **public/BGM/8bits for MIDI, next to the input for mp3**, mechanism: MIDI sources live in BGM/midi but the game plays from BGM/8bits
        if out.exists() and not a.force:
            print(f"skip {out} (exists, use --force)")
            continue
        if is_midi:
            render_midi(src, out, a.speed, a.transpose)
        else:
            crush(src, out, a.bits, a.rate, not a.stereo)
        print(f"wrote {out}")
# each input becomes <name>_8bit.mp3: MIDI in public/BGM/8bits, mp3 beside
# the input, or both in --out. With no paths, public/BGM/midi is rendered. A .mid is
# synthesized as chiptune, an .mp3 is bitcrushed. Existing
# outputs are kept unless --force, matching dialog.py's cache-first habit


if __name__ == "__main__":
    main()
