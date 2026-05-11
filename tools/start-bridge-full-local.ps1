param(
    [string]$WhisperConfig = ".\local-asr\whispercpp.config.json",
    [string]$ArgosConfig = ".\local-asr\argos.config.json",
    [string]$Threads = "8"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$whisperConfigPath = Resolve-Path (Join-Path $root $WhisperConfig)
$argosConfigPath = Resolve-Path (Join-Path $root $ArgosConfig)
$asr = Get-Content -LiteralPath $whisperConfigPath -Raw | ConvertFrom-Json
$argos = Get-Content -LiteralPath $argosConfigPath -Raw | ConvertFrom-Json

$asrArgs = @(
    "python",
    ".\bridge\whispercpp_asr.py",
    "--audio",
    "{audio}",
    "--lang",
    "{source_lang}",
    "--whisper",
    $asr.whisper,
    "--model",
    $asr.model,
    "--ffmpeg",
    $asr.ffmpeg,
    "--threads",
    $Threads
)

$translateArgs = @(
    $argos.python,
    ".\bridge\argos_translate.py",
    "--text",
    "{text}",
    "--source",
    "{source_lang}",
    "--target",
    "{target_lang}"
)

$env:TAT_ASR_ARGS = ($asrArgs | ConvertTo-Json -Compress)
$env:TAT_TRANSLATE_ARGS = ($translateArgs | ConvertTo-Json -Compress)
Write-Host "Starting full local bridge: whisper.cpp ASR + Argos Translate"
Set-Location $root
python .\bridge\server.py
