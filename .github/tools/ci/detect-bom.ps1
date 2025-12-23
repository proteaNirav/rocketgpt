param(
  [string[]]$Paths = @(".github/workflows")
)

$ErrorActionPreference = "Stop"
$bad = @()

function Has-Utf8Bom([string]$file) {
  [byte[]]$b = [IO.File]::ReadAllBytes($file)
  return ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF)
}

foreach ($p in $Paths) {
  if (-not (Test-Path $p)) { continue }
  Get-ChildItem $p -Recurse -File -Include *.yml,*.yaml,*.md,*.json,*.ts,*.tsx,*.ps1 | ForEach-Object {
    if (Has-Utf8Bom $_.FullName) { $bad += $_.FullName }
  }
}

if ($bad.Count -gt 0) {
  Write-Host "[FAIL] UTF-8 BOM detected in:" -ForegroundColor Red
  $bad | ForEach-Object { Write-Host " - $_" }
  exit 2
}

Write-Host "[OK] No UTF-8 BOM detected in scanned files." -ForegroundColor Green
