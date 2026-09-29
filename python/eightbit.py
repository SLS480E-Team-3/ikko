"""8-bit converter: python eightbit.py <mp3 or folder>... [--bits 8] [--rate 11025] [--out DIR]"""

import argparse
import subprocess
from pathlib import Path

import gemini_tts as g

WORK_RATE = 44100  # every file is resampled to this before crushing, so --rate means the same thing for any input
SUFFIX = "_8bit"


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


def inputs(paths: list[str]) -> list[Path]:
    files = []
    for p in map(Path, paths):
        if p.is_dir():
            files += sorted(f for f in p.rglob("*.mp3") if not f.stem.endswith(SUFFIX))
        elif p.is_file():
            files.append(p)
        else:
            g.die(f"not found: {p}")
    if not files:
        g.die("no mp3 files found")
    return files
# a folder is walked recursively for .mp3s, skipping earlier outputs
# (*_8bit.mp3) so running it twice doesn't crush them again


def main() -> None:
    ap = argparse.ArgumentParser(description="Convert mp3s to an 8-bit (bitcrushed) sound.")
    ap.add_argument("paths", nargs="+", help="mp3 files or folders")
    ap.add_argument("--bits", type=float, default=8, help="bit depth, lower is grittier (default 8)")
    ap.add_argument("--rate", type=int, default=11025, help="effective sample rate in Hz, lower is fizzier (default 11025)")
    ap.add_argument("--out", help="output folder (default: next to each input)")
    ap.add_argument("--stereo", action="store_true", help="keep stereo (default: mono, like old consoles)")
    ap.add_argument("--force", action="store_true", help="overwrite existing outputs")
    a = ap.parse_args()
    if not 1 <= a.bits <= 64:
        g.die("--bits must be 1..64")
    if not WORK_RATE / 250 <= a.rate <= WORK_RATE:
        g.die(f"--rate must be {round(WORK_RATE / 250)}..{WORK_RATE}")
    g.need_ffmpeg()

    for src in inputs(a.paths):
        out = (Path(a.out) if a.out else src.parent) / f"{src.stem}{SUFFIX}.mp3"
        if out.exists() and not a.force:
            print(f"skip {out} (exists, use --force)")
            continue
        crush(src, out, a.bits, a.rate, not a.stereo)
        print(f"wrote {out}")
# each input becomes <name>_8bit.mp3, beside it or in --out. Existing
# outputs are kept unless --force, matching dialog.py's cache-first habit


if __name__ == "__main__":
    main()
