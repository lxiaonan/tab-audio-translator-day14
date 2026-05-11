# Agents Guide

## Project Purpose

Tab Audio Translator is a Chrome extension plus local Python bridge for current-tab audio capture and live subtitle translation. The core principle is honesty: the extension can capture audio, but real recognition/translation requires a configured ASR/translation engine.

## File Map

- `manifest.json`: Chrome Manifest V3 extension declaration.
- `extension/popup.html`: Extension popup UI.
- `extension/popup.css`: Popup design system and layout.
- `extension/popup.js`: Popup state, settings, start/stop commands, log copy.
- `extension/service-worker.js`: `tabCapture`, `MediaRecorder`, audio chunk upload, session state, caption broadcasting.
- `extension/offscreen.html`: MV3 offscreen document container for media capture.
- `extension/offscreen.js`: receives stream IDs, records audio chunks, uploads them to the bridge.
- `extension/content-overlay.js`: Injected caption overlay renderer.
- `extension/content-overlay.css`: Isolated caption overlay style.
- `bridge/server.py`: Local Python HTTP bridge for health checks and audio chunk processing.
- `bridge/whispercpp_asr.py`: Converts browser WebM chunks to WAV and runs whisper.cpp.
- `bridge/README.md`: Bridge setup and engine hook instructions.
- `tools/setup-whispercpp.ps1`: Downloads whisper.cpp, ffmpeg, and a selected model.
- `tools/start-bridge-whispercpp.ps1`: Starts the bridge with `TAT_ASR_ARGS` wired to whisper.cpp.
- `index.html`: GitHub Pages product/guide page.
- `site.css`: Public page design system.
- `site.js`: Public page bilingual toggle.
- `docs/BEGINNER-GUIDE.md`: Bilingual beginner usage guide.
- `docs/screenshot.png`: Required screenshot.
- `docs/demo.gif`: Required demo GIF.

## Guardrails

- Do not claim the GitHub Pages page can capture arbitrary tab audio. Only the Chrome extension can use `tabCapture`.
- Do not fake ASR/translation. If no engine is configured, return a visible not-configured status.
- Prefer `TAT_ASR_ARGS` JSON argv arrays over shell strings for Windows paths with spaces.
- Do not commit `local-asr/` or test audio; models and binaries are local machine artifacts.
- Keep audio local by default. Do not add cloud upload providers without explicit user configuration and documentation.
- `tabCapture` may have Chrome version and user-gesture constraints; preserve clear error messages.
- Keep subtitle overlay bounded, readable, and non-interactive so it does not break host pages.
- Long logs and long translated text must wrap safely.

## Next-Step Ideas

- Add a faster-whisper adapter script.
- Add a local subtitle timeline export to SRT/VTT.
- Add per-site caption style presets.
- Add streaming WebSocket mode to reduce latency compared with chunked HTTP.
- Add optional glossary replacement for names and technical terms.
