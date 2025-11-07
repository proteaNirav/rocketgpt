# .github/tools/rgpt-touch-sandbox.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$target = Join-Path (Get-Location) '.github/RGPT_SANDBOX.md'
$content = "RGPT Sandbox marker — $(Get-Date -Format o)"
Set-Content -Path $target -Value $content -NoNewline
Write-Host "Wrote $target"