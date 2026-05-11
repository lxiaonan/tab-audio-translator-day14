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

## Real Engine Hook

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
