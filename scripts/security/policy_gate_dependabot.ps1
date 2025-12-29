param(
  [Parameter(Mandatory=$false)]
  [string]$TriagePath = "docs/security/dependabot/RGPT-S2-C-04-triage.open.json",

  # Only manifests under these prefixes are enforced (block merges)
  [Parameter(Mandatory=$false)]
  [string[]]$EnforcedManifestPrefixes = @(
    "rocketgpt_v3_full/webapp/next/"
  ),

  # Manifests under these prefixes are ignored (tooling/staging)
  [Parameter(Mandatory=$false)]
  [string[]]$IgnoreManifestPrefixes = @(
    ".ops/claude/staging/"
  )
)

$ErrorActionPreference = "Stop"

function StartsWithAny([string]$value, [string[]]$prefixes) {
  foreach ($p in $prefixes) {
    if ($value -and $value.StartsWith($p, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
  }
  return $false
}

if (-not (Test-Path $TriagePath)) { throw "Missing triage file: $TriagePath" }

$rows = Get-Content $TriagePath -Raw | ConvertFrom-Json
if (-not $rows) { Write-Host "[OK] No triage rows." -ForegroundColor Green; exit 0 }

# Filter: ignore staging/tooling
$rows = $rows | Where-Object { -not (StartsWithAny $_.manifest $IgnoreManifestPrefixes) }

# Filter: enforce only production prefixes
$inScope = $rows | Where-Object { StartsWithAny $_.manifest $EnforcedManifestPrefixes }

Write-Host "[POLICY] Dependabot triage rows total: $($rows.Count)" -ForegroundColor Cyan
Write-Host "[POLICY] In-scope rows (enforced): $($inScope.Count)" -ForegroundColor Cyan

if ($inScope.Count -eq 0) {
  Write-Host "[OK] No in-scope vulnerabilities found (after filters)." -ForegroundColor Green
  exit 0
}

$high = @($inScope | Where-Object { $_.severity -eq "high" })
$med  = @($inScope | Where-Object { $_.severity -eq "medium" -or $_.severity -eq "moderate" })
$low  = @($inScope | Where-Object { $_.severity -eq "low" })

function PrintRows($title, $arr) {
  if (-not $arr -or $arr.Count -eq 0) { return }
  Write-Host ""
  Write-Host $title -ForegroundColor Yellow
  $arr | Sort-Object package, number | ForEach-Object {
    Write-Host (" - #{0} {1} | {2} | manifest={3} | patched_in={4}" -f `
      $_.number, $_.severity, $_.package, $_.manifest, ($_.patched_in -join ","))
  }
}

PrintRows "[OPEN][HIGH] Blocking items:" $high
PrintRows "[OPEN][MED] Warning items:"  $med
PrintRows "[OPEN][LOW] Info items:"     $low

if ($high.Count -gt 0) {
  Write-Host ""
  Write-Host ("[FAIL] Policy Gate: {0} high severity Dependabot alert(s) in enforced scope." -f $high.Count) -ForegroundColor Red
  exit 2
}

Write-Host ""
Write-Host "[OK] Policy Gate passed (no high in enforced scope)." -ForegroundColor Green
exit 0
