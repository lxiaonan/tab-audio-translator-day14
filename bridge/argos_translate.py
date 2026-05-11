from __future__ import annotations

import argparse
import sys

from argostranslate import translate


LANG_MAP = {
    "zh-CN": "zh",
    "zh_cn": "zh",
    "cn": "zh",
    "jp": "ja",
    "kr": "ko",
    "auto": "en",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Translate text with locally installed Argos Translate packages.")
    parser.add_argument("--text", default="", help="Text to translate. If omitted, stdin is used.")
    parser.add_argument("--source", default="en", help="Source language code.")
    parser.add_argument("--target", default="zh", help="Target language code.")
    args = parser.parse_args()

    text = args.text or sys.stdin.read()
    text = text.strip()
    if not text:
        return

    source = normalize_lang(args.source)
    target = normalize_lang(args.target)
    if source == target:
        print(text)
        return

    installed = translate.get_installed_languages()
    from_lang = next((lang for lang in installed if lang.code == source), None)
    to_lang = next((lang for lang in installed if lang.code == target), None)
    if not from_lang or not to_lang:
        raise SystemExit(f"Missing Argos language package: {source} -> {target}")

    translation = from_lang.get_translation(to_lang)
    print(translation.translate(text).strip())


def normalize_lang(value: str) -> str:
    value = (value or "en").strip()
    return LANG_MAP.get(value, value)


if __name__ == "__main__":
    main()
