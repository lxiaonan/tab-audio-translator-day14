from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request


LANG_MAP = {
    "zh": "ZH",
    "zh-cn": "ZH",
    "zh_cn": "ZH",
    "cn": "ZH",
    "en": "EN",
    "ja": "JA",
    "jp": "JA",
    "ko": "KO",
    "kr": "KO",
    "auto": "auto",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate text with a DeepLX-compatible HTTP endpoint.")
    parser.add_argument("--text", default="", help="Text to translate. If omitted, stdin is used.")
    parser.add_argument("--source", default="auto", help="Source language code, for example en or auto.")
    parser.add_argument("--target", default="zh", help="Target language code, for example zh.")
    parser.add_argument("--url", required=True, help="DeepLX /translate endpoint URL.")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP timeout in seconds.")
    args = parser.parse_args()

    text = (args.text or sys.stdin.read()).strip()
    if not text:
        return

    payload = {
        "text": text,
        "source_lang": normalize_lang(args.source),
        "target_lang": normalize_lang(args.target),
    }

    request = urllib.request.Request(
        args.url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Accept": "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 TabAudioTranslator/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=args.timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"DeepLX HTTP {exc.code}: {body[:400]}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"DeepLX request failed: {exc.reason}") from exc

    result = json.loads(raw)
    translated = extract_translation(result)
    if not translated:
        raise SystemExit(f"DeepLX response did not contain translated text: {raw[:400]}")

    print(translated.strip())


def normalize_lang(value: str) -> str:
    normalized = (value or "auto").strip().lower()
    return LANG_MAP.get(normalized, normalized.upper())


def extract_translation(result: object) -> str:
    if isinstance(result, dict):
        data = result.get("data")
        if isinstance(data, str):
            return data
        if isinstance(data, dict):
            nested = data.get("text") or data.get("translation")
            if isinstance(nested, str):
                return nested
        for key in ("translation", "translated_text", "text"):
            value = result.get(key)
            if isinstance(value, str):
                return value
    return ""


if __name__ == "__main__":
    main()
