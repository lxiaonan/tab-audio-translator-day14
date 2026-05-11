# Local Bridge

This bridge receives WebM audio chunks from the Chrome extension and returns JSON captions.

## Start

```powershell
python .\bridge\server.py
```

Health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8787/health
```

## whisper.cpp Local ASR

Recommended for Windows machines without NVIDIA CUDA:

```powershell
.\tools\setup-whispercpp.ps1 -Model base
.\tools\start-bridge-whispercpp.ps1
```

The setup script installs:

- whisper.cpp Windows x64 binary
- `ggml-base.bin` model by default
- ffmpeg for WebM/Opus to WAV conversion

## Generic Real Engine Hook

By default the bridge does not fake speech recognition. It returns a clear message saying the ASR engine is not configured.

Set `TAT_ASR_COMMAND` to a local command that accepts `{audio}` and prints recognized text:

```powershell
$env:TAT_ASR_COMMAND = "python .\my_asr.py --audio {audio} --lang {source_lang}"
python .\bridge\server.py
```

Optional translation command:

```powershell
$env:TAT_TRANSLATE_COMMAND = "python .\my_translate.py --text ""{text}"" --source {source_lang} --target {target_lang}"
python .\bridge\server.py
```

The bridge intentionally uses command hooks so it can work with Whisper, faster-whisper, local API wrappers, or an internal translation service without hard-coding a paid provider.

For safer Windows quoting, `TAT_ASR_ARGS` can be set to a JSON argv array. `tools/start-bridge-whispercpp.ps1` uses this mode.
