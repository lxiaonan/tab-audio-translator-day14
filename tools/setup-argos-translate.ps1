param(
    [string]$From = "en",
    [string]$To = "zh",
    [string]$Venv = ".\.venv-translate"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

if (-not (Test-Path -LiteralPath $Venv)) {
    python -m venv $Venv
}

$python = Resolve-Path (Join-Path $Venv "Scripts\python.exe")
& $python -m pip install --upgrade pip
& $python -m pip install argostranslate

$installer = @"
from argostranslate import package
package.update_package_index()
packages = package.get_available_packages()
match = next((p for p in packages if p.from_code == "$From" and p.to_code == "$To"), None)
if match is None:
    raise SystemExit("No Argos package found for $From -> $To")
path = match.download()
package.install_from_path(path)
print(f"installed {match.from_code}->{match.to_code}: {path}")
"@

$installer | & $python -

$configPath = Join-Path $root "local-asr\argos.config.json"
New-Item -ItemType Directory -Force (Split-Path $configPath) | Out-Null
[PSCustomObject]@{
    python = $python.Path
    from = $From
    to = $To
} | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $configPath -Encoding utf8

Write-Host "Argos Translate configured: $configPath"
