param(
    [string]$Config = ".\local-asr\whispercpp.config.json",
    [string]$Threads = "8"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$configPath = Resolve-Path (Join-Path $root $Config)
$asr = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json

$args = @(
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

$env:TAT_ASR_ARGS = ($args | ConvertTo-Json -Compress)
Write-Host "Starting bridge with whisper.cpp ASR..."
Write-Host "Model: $($asr.model)"
Set-Location $root
python .\bridge\server.py
