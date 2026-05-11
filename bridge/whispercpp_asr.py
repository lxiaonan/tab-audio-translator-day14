from __future__ import annotations

import argparse
import subprocess
import tempfile
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Run whisper.cpp against a browser audio chunk.")
    parser.add_argument("--audio", required=True, help="Input audio chunk, usually WebM/Opus from MediaRecorder.")
    parser.add_argument("--lang", default="auto", help="Source language, or auto.")
    parser.add_argument("--whisper", required=True, help="Path to whisper-cli.exe or main.exe.")
    parser.add_argument("--model", required=True, help="Path to ggml Whisper model.")
    parser.add_argument("--ffmpeg", default="ffmpeg", help="Path to ffmpeg.exe.")
    parser.add_argument("--threads", default="8", help="whisper.cpp thread count.")
    args = parser.parse_args()

    audio_path = Path(args.audio)
    whisper_path = Path(args.whisper)
    model_path = Path(args.model)
    ffmpeg_path = Path(args.ffmpeg)
    require_file(audio_path, "audio")
    require_file(whisper_path, "whisper executable")
    require_file(model_path, "model")
    require_file(ffmpeg_path, "ffmpeg")

    with tempfile.TemporaryDirectory(prefix="tat-whispercpp-") as tmp:
        wav_path = Path(tmp) / "chunk.wav"
        subprocess.run(
            [
                str(ffmpeg_path),
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(audio_path),
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                str(wav_path),
            ],
            check=True,
        )

        command = [
            str(whisper_path),
            "-m",
            str(model_path),
            "-f",
            str(wav_path),
            "-nt",
            "-t",
            str(args.threads),
        ]
        if args.lang and args.lang != "auto":
            command.extend(["-l", args.lang])
        completed = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
    print(clean_output(completed.stdout))


def require_file(path: Path, label: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Missing {label}: {path}")


def clean_output(value: str) -> str:
    lines = []
    for line in value.splitlines():
        text = line.strip()
        if not text or text.startswith("whisper_") or text.startswith("system_info:"):
            continue
        lines.append(text)
    return " ".join(lines).strip()


if __name__ == "__main__":
    main()
