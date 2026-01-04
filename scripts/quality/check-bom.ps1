param(
  [string]$Root = "."
)

$ErrorActionPreference="Stop"

$patterns = @("*.ts","*.tsx","*.js","*.jsx","*.json","*.md","*.yml","*.yaml")
$files = @()
foreach ($p in $patterns) {
  $files += Get-ChildItem -Path $Root -Recurse -File -Filter $p -ErrorAction SilentlyContinue
}

$bom = New-Object System.Collections.Generic.List[string]
foreach ($f in $files) {
  try {
    [byte[]]$b = [System.IO.File]::ReadAllBytes($f.FullName)
    if ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) {
      $bom.Add($f.FullName)
    }
  } catch {}
}

if ($bom.Count -gt 0) {
  Write-Host "[FAIL] UTF-8 BOM detected in:" -ForegroundColor Red
  $bom | Sort-Object | ForEach-Object { Write-Host (" - " + $_) -ForegroundColor Yellow }
  exit 2
}

Write-Host "[OK] No UTF-8 BOM detected." -ForegroundColor Green
exit 0
