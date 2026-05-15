from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request


LANG_MAP = {
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "zh_cn": "zh-CN",
    "cn": "zh-CN",
    "en": "en",
    "ja": "ja",
    "jp": "ja",
    "ko": "ko",
    "kr": "ko",
    "auto": "auto",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate text with Google's public translate endpoint.")
    parser.add_argument("--text", default="", help="Text to translate. If omitted, stdin is used.")
    parser.add_argument("--source", default="auto", help="Source language code.")
    parser.add_argument("--target", default="zh", help="Target language code.")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP timeout in seconds.")
    args = parser.parse_args()

    text = (args.text or sys.stdin.read()).strip()
    if not text:
        return

    params = urllib.parse.urlencode(
        {
            "client": "gtx",
            "sl": normalize_lang(args.source),
            "tl": normalize_lang(args.target),
            "dt": "t",
            "q": text,
        }
    )
    url = f"https://translate.googleapis.com/translate_a/single?{params}"

    with urllib.request.urlopen(url, timeout=args.timeout) as response:
        raw = response.read().decode("utf-8", errors="replace")

    result = json.loads(raw)
    translated = extract_translation(result)
    if not translated:
        raise SystemExit(f"Google Translate response did not contain translated text: {raw[:400]}")

    print(translated.strip())


def normalize_lang(value: str) -> str:
    normalized = (value or "auto").strip().lower()
    return LANG_MAP.get(normalized, normalized)


def extract_translation(result: object) -> str:
    if not isinstance(result, list) or not result:
        return ""
    segments = result[0]
    if not isinstance(segments, list):
        return ""
    translated_parts: list[str] = []
    for segment in segments:
        if isinstance(segment, list) and segment and isinstance(segment[0], str):
            translated_parts.append(segment[0])
    return "".join(translated_parts)


if __name__ == "__main__":
    main()
