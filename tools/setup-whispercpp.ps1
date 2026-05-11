param(
    [ValidateSet("tiny", "base", "small")]
    [string]$Model = "base",

    [string]$InstallDir = ".\local-asr"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$installPath = Join-Path $root $InstallDir
$binPath = Join-Path $installPath "whisper-bin-x64"
$modelPath = Join-Path $installPath "models"
$ffmpegPath = Join-Path $installPath "ffmpeg"
New-Item -ItemType Directory -Force $installPath, $modelPath, $ffmpegPath | Out-Null

function Download-File {
    param([string]$Url, [string]$OutFile)
    if (Test-Path -LiteralPath $OutFile) {
        Write-Host "[skip] $OutFile"
        return
    }
    Write-Host "[download] $Url"
    curl.exe -L $Url -o $OutFile
}

$release = Invoke-RestMethod -UseBasicParsing "https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest"
$asset = $release.assets | Where-Object { $_.name -eq "whisper-bin-x64.zip" } | Select-Object -First 1
if (-not $asset) {
    throw "Unable to find whisper-bin-x64.zip in the latest whisper.cpp release."
}

$zipPath = Join-Path $installPath "whisper-bin-x64.zip"
Download-File -Url $asset.browser_download_url -OutFile $zipPath
if (-not (Test-Path -LiteralPath (Join-Path $binPath "whisper-cli.exe"))) {
    Expand-Archive -LiteralPath $zipPath -DestinationPath $binPath -Force
}

$modelFile = Join-Path $modelPath "ggml-$Model.bin"
Download-File -Url "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-$Model.bin" -OutFile $modelFile

$ffmpegZip = Join-Path $ffmpegPath "ffmpeg-release-essentials.zip"
Download-File -Url "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $ffmpegZip
if (-not (Get-ChildItem -Path $ffmpegPath -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1)) {
    Expand-Archive -LiteralPath $ffmpegZip -DestinationPath $ffmpegPath -Force
}

$whisperExe = Get-ChildItem -Path $binPath -Recurse -Filter "whisper-cli.exe" | Select-Object -First 1
if (-not $whisperExe) {
    $whisperExe = Get-ChildItem -Path $binPath -Recurse -Filter "main.exe" | Select-Object -First 1
}
$ffmpegExe = Get-ChildItem -Path $ffmpegPath -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
if (-not $whisperExe -or -not $ffmpegExe) {
    throw "Install failed: whisper or ffmpeg executable not found."
}

$config = [PSCustomObject]@{
    whisper = $whisperExe.FullName
    model = (Resolve-Path $modelFile).Path
    ffmpeg = $ffmpegExe.FullName
    model_name = $Model
}
$configPath = Join-Path $installPath "whispercpp.config.json"
$config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $configPath -Encoding utf8

Write-Host ""
Write-Host "Installed whisper.cpp ASR components:"
Write-Host "Config: $configPath"
Write-Host "Whisper: $($config.whisper)"
Write-Host "Model: $($config.model)"
Write-Host "FFmpeg: $($config.ffmpeg)"
