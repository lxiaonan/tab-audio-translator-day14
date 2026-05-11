from __future__ import annotations

import json
import os
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


HOST = "127.0.0.1"
PORT = int(os.environ.get("TAT_BRIDGE_PORT", "8787"))
ASR_COMMAND = os.environ.get("TAT_ASR_COMMAND", "").strip()
ASR_ARGS = os.environ.get("TAT_ASR_ARGS", "").strip()
TRANSLATE_COMMAND = os.environ.get("TAT_TRANSLATE_COMMAND", "").strip()
TRANSLATE_ARGS = os.environ.get("TAT_TRANSLATE_ARGS", "").strip()


class Handler(BaseHTTPRequestHandler):
    server_version = "TabAudioTranslatorBridge/1.0"

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/health":
            self.json_response(
                {
                    "ok": True,
                    "mode": bridge_mode(),
                    "asr_configured": bool(ASR_COMMAND or ASR_ARGS),
                    "translate_configured": bool(TRANSLATE_COMMAND or TRANSLATE_ARGS),
                }
            )
            return
        self.json_response({"ok": False, "error": "not found"}, status=404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/translate-chunk":
            self.json_response({"ok": False, "error": "not found"}, status=404)
            return

        form = parse_multipart(self.headers.get("Content-Type", ""), self.rfile.read(int(self.headers.get("Content-Length", "0"))))
        audio = form.get("audio")
        source_lang = text_value(form, "source_lang", "auto")
        target_lang = text_value(form, "target_lang", "zh")
        chunk_index = text_value(form, "chunk_index", "0")

        if audio is None or not audio.get("content"):
            self.json_response({"ok": False, "error": "missing audio"}, status=400)
            return

        with tempfile.TemporaryDirectory(prefix="tat-bridge-") as tmp:
            audio_path = Path(tmp) / f"chunk-{chunk_index}.webm"
            audio_path.write_bytes(audio["content"])
            source_text = run_asr(audio_path, source_lang)
            translated_text = run_translate(source_text, source_lang, target_lang)

        self.json_response(
            {
                "ok": True,
                "status": "needs-engine" if not (ASR_COMMAND or ASR_ARGS) else "ok",
                "source_text": source_text,
                "translated_text": translated_text,
                "source_lang": source_lang,
                "target_lang": target_lang,
                "chunk_index": chunk_index,
                "mode": bridge_mode(),
            }
        )

    def json_response(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format: str, *args) -> None:
        print(f"[bridge] {self.address_string()} {format % args}")


def run_asr(audio_path: Path, source_lang: str) -> str:
    if not (ASR_COMMAND or ASR_ARGS):
        return (
            "ASR engine is not configured. Set TAT_ASR_COMMAND to a command that accepts "
            "{audio} and prints recognized text, or set TAT_ASR_ARGS to a JSON argv array."
        )
    values = {"audio": str(audio_path), "source_lang": source_lang}
    if ASR_ARGS:
        return run_template_args(ASR_ARGS, values)
    return run_template_command(ASR_COMMAND, values)


def run_translate(source_text: str, source_lang: str, target_lang: str) -> str:
    if not (ASR_COMMAND or ASR_ARGS):
        return (
            "未配置真实语音识别引擎。请在本地桥接服务中设置 TAT_ASR_COMMAND 后再开始实时翻译。"
        )
    if not (TRANSLATE_COMMAND or TRANSLATE_ARGS):
        return source_text
    if TRANSLATE_ARGS:
        return run_template_args(
            TRANSLATE_ARGS,
            {"text": source_text, "source_lang": source_lang, "target_lang": target_lang},
        )
    return run_template_command(
        TRANSLATE_COMMAND,
        {"text": source_text, "source_lang": source_lang, "target_lang": target_lang},
    )


def run_template_command(template: str, values: dict[str, str]) -> str:
    command = template
    for key, value in values.items():
        command = command.replace("{" + key + "}", value)
    completed = subprocess.run(
        command,
        shell=True,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return completed.stdout.strip()


def run_template_args(template: str, values: dict[str, str]) -> str:
    raw_args = json.loads(template)
    if not isinstance(raw_args, list):
        raise ValueError("TAT_ASR_ARGS must be a JSON array.")
    args = [replace_tokens(str(part), values) for part in raw_args]
    completed = subprocess.run(
        args,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return completed.stdout.strip()


def replace_tokens(value: str, values: dict[str, str]) -> str:
    result = value
    for key, replacement in values.items():
        result = result.replace("{" + key + "}", replacement)
    return result


def parse_multipart(content_type: str, body: bytes) -> dict[str, dict[str, bytes | str]]:
    marker = "boundary="
    if marker not in content_type:
        return {}
    boundary = ("--" + content_type.split(marker, 1)[1].strip().strip('"')).encode("utf-8")
    fields: dict[str, dict[str, bytes | str]] = {}
    for part in body.split(boundary):
        part = part.strip(b"\r\n")
        if not part or part == b"--" or b"\r\n\r\n" not in part:
            continue
        raw_headers, content = part.split(b"\r\n\r\n", 1)
        headers = raw_headers.decode("utf-8", errors="replace")
        name = header_param(headers, "name")
        filename = header_param(headers, "filename")
        if not name:
            continue
        fields[name] = {
            "filename": filename,
            "content": content.rstrip(b"\r\n"),
        }
    return fields


def header_param(headers: str, key: str) -> str:
    token = f'{key}="'
    if token not in headers:
        return ""
    return headers.split(token, 1)[1].split('"', 1)[0]


def text_value(form: dict[str, dict[str, bytes | str]], key: str, default: str) -> str:
    if key not in form:
        return default
    content = form[key].get("content", b"")
    if isinstance(content, bytes):
        return content.decode("utf-8", errors="replace")
    return str(content)


def bridge_mode() -> str:
    if (ASR_COMMAND or ASR_ARGS) and (TRANSLATE_COMMAND or TRANSLATE_ARGS):
        return "asr-and-translate"
    if ASR_COMMAND or ASR_ARGS:
        return "asr-only"
    return "explicit-placeholder"


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Tab Audio Translator bridge listening on http://{HOST}:{PORT}")
    print(f"Mode: {bridge_mode()}")
    server.serve_forever()


if __name__ == "__main__":
    main()
