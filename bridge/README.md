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

## Argos Translate Local Translation

Install English-to-Chinese translation:

```powershell
.\tools\setup-argos-translate.ps1 -From en -To zh
```

Start the full local bridge:

```powershell
.\tools\start-bridge-full-local.ps1
```

Expected health response:

```json
{"mode":"asr-and-translate","asr_configured":true,"translate_configured":true}
```

## Online Translation Backends

Use these when local Argos translation quality is not good enough. The ASR still runs locally with whisper.cpp; only recognized text is sent out for translation.

### Google Public Translate Endpoint

No key is required:

```powershell
.\tools\start-bridge-online-translate.ps1 -Provider Google
```

Or double-click:

```text
start-online-google-translator.bat
```

### DeepLX-Compatible Endpoint

Set the endpoint only on your local machine. Do not commit it:

```powershell
$env:TAT_DEEPLX_URL = "your full DeepLX /translate endpoint"
.\tools\start-bridge-online-translate.ps1 -Provider DeepLX
```

The adapter expects a JSON response with a `data` string, and also accepts common fallback fields such as `translation`, `translated_text`, or `text`.

### Verified Pipeline

The online mode was verified with the bundled `docs/asr-test.webm` file:

```text
WebM audio chunk -> whisper.cpp -> recognized English text -> DeepLX / Google -> Chinese caption text
```
