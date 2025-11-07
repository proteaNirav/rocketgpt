Write-Host "🔧 Local Self-Heal helper. This script is NOT used in CI."
Write-Host "Running repository diagnostics..."
& ".github/tools/Self-Heal-Improve.ps1" -VerboseMode
