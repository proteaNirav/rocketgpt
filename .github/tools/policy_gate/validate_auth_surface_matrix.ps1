param(
  [Parameter(Mandatory)][string]$AllowlistJson,
  [Parameter(Mandatory)][string]$MatrixMd
)

$ErrorActionPreference="Stop"

function Fail([string]$msg) {
  Write-Host "[FAIL] $msg" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $AllowlistJson)) { Fail "Missing allowlist json: $AllowlistJson" }
if (-not (Test-Path $MatrixMd))      { Fail "Missing matrix md: $MatrixMd" }

# --- Load allowlist routes ---
$payload = Get-Content $AllowlistJson -Raw | ConvertFrom-Json
$allow = @($payload.runtime_allowlist | ForEach-Object { "$($_.route)".Trim() }) | Where-Object { $_ } | Sort-Object -Unique
if ($allow.Count -lt 1) { Fail "No routes found in runtime_allowlist." }

# --- Parse matrix table rows: | route | auth | notes |
$md = Get-Content $MatrixMd
$rows = @()
foreach ($line in $md) {
  $t = $line.Trim()
  if ($t -match '^\|\s*/') {
    # split by | and trim
    $parts = $t.Trim('|') -split '\|' | ForEach-Object { $_.Trim() }
    if ($parts.Count -ge 2) {
      $route = $parts[0]
      $auth  = $parts[1]
      $rows += [pscustomobject]@{ route=$route; auth=$auth }
    }
  }
}
$matrixRoutes = @($rows.route | ForEach-Object { "$_".Trim() }) | Where-Object { $_ } | Sort-Object -Unique

if ($matrixRoutes.Count -lt 1) { Fail "No matrix routes parsed. Ensure the table contains rows like: | /api/x | auth | |" }

# --- Allowed auth values ---
$allowedAuth = @("public","anon","auth","service","admin")

$badAuth = @($rows | Where-Object { $_.auth -and ($allowedAuth -notcontains $_.auth) })
if ($badAuth.Count -gt 0) {
  $sample = ($badAuth | Select-Object -First 10 | ForEach-Object { "$($_.route):$($_.auth)" }) -join ", "
  Fail "Invalid auth values found (allowed: $($allowedAuth -join ', ')). Sample: $sample"
}

# --- Compare sets ---
$missingInMatrix = Compare-Object -ReferenceObject $allow -DifferenceObject $matrixRoutes -PassThru | Where-Object { $_ -in $allow }
$extraInMatrix   = Compare-Object -ReferenceObject $allow -DifferenceObject $matrixRoutes -PassThru | Where-Object { $_ -in $matrixRoutes }

if ($missingInMatrix.Count -gt 0) {
  Write-Host "`n[DIFF] Routes present in allowlist but missing in matrix:" -ForegroundColor Yellow
  $missingInMatrix | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
  Fail "Matrix missing $($missingInMatrix.Count) allowlisted routes."
}

if ($extraInMatrix.Count -gt 0) {
  Write-Host "`n[DIFF] Routes present in matrix but NOT in allowlist:" -ForegroundColor Yellow
  $extraInMatrix | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
  Fail "Matrix contains $($extraInMatrix.Count) non-allowlisted routes (clean this up or update allowlist generator)."
}

Write-Host "[OK] Route→Auth matrix validation passed. Routes: $($allow.Count)" -ForegroundColor Green
exit 0
