param(
    [ValidateSet("Google", "DeepLX")]
    [string]$Provider = "Google",
    [string]$WhisperConfig = ".\local-asr\whispercpp.config.json",
    [string]$Threads = "8",
    [string]$DeepLXUrl = $env:TAT_DEEPLX_URL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$whisperConfigPath = Resolve-Path (Join-Path $root $WhisperConfig)
$asr = Get-Content -LiteralPath $whisperConfigPath -Raw | ConvertFrom-Json

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

if ($Provider -eq "DeepLX") {
    if ([string]::IsNullOrWhiteSpace($DeepLXUrl)) {
        throw "DeepLX mode requires TAT_DEEPLX_URL, for example: `$env:TAT_DEEPLX_URL='https://your-deeplx.example/translate'"
    }
    $translateArgs = @(
        "python",
        ".\bridge\deeplx_translate.py",
        "--text",
        "{text}",
        "--source",
        "{source_lang}",
        "--target",
        "{target_lang}",
        "--url",
        $DeepLXUrl
    )
} else {
    $translateArgs = @(
        "python",
        ".\bridge\google_translate.py",
        "--text",
        "{text}",
        "--source",
        "{source_lang}",
        "--target",
        "{target_lang}"
    )
}

$env:TAT_ASR_ARGS = ($asrArgs | ConvertTo-Json -Compress)
$env:TAT_TRANSLATE_ARGS = ($translateArgs | ConvertTo-Json -Compress)
Write-Host "Starting bridge: whisper.cpp ASR + $Provider online translation"
Write-Host "Privacy note: recognized text will be sent to the selected online translation endpoint."
Set-Location $root
python .\bridge\server.py
