# RGPT Security â€” API Surface Drift Check
# Fails if Next.js app/api routes exist on disk but are missing from docs/security/generated/RUNTIME_ALLOWLIST.json

$ErrorActionPreference = "Stop"

$nextApiRoot = "rocketgpt_v3_full/webapp/next/app/api"
$allowJson = "docs/security/generated/RUNTIME_ALLOWLIST.json"

if (-not (Test-Path $nextApiRoot)) {
  Write-Host "[SKIP] No Next.js app/api directory found."
  exit 0
}
if (-not (Test-Path $allowJson)) { throw "Missing RUNTIME_ALLOWLIST.json" }

# Normalize to ABSOLUTE path for correct replacement
$apiRootAbs = (Resolve-Path $nextApiRoot).Path.Replace("\","/")

# Discover actual API routes from filesystem (ignore backup variants)
$actual = Get-ChildItem -Path $nextApiRoot -Recurse -File |
  Where-Object {
    $_.Name -match '^route\.(ts|js|mjs|cjs)$'   # ONLY real route files
  } |
  ForEach-Object {
    $p = $_.FullName.Replace("\","/")

    # Strip absolute api root
    $rel = $p.Substring($apiRootAbs.Length)

    # rel like: /orchestrator/run/status/route.ts  => /api/orchestrator/run/status
    $rel = ($rel -replace "/route\.(ts|js|mjs|cjs)$","")
    $rel = ($rel -replace "^/","/api/")
    $rel
  } |
  Sort-Object -Unique

# Load allowlist
$allow = (Get-Content $allowJson -Raw | ConvertFrom-Json).runtime_allowlist |
  ForEach-Object { $_.route } |
  Sort-Object -Unique

# Compare
$missing = $actual | Where-Object { $_ -notin $allow }

if ($missing.Count -gt 0) {
  Write-Host "[FAIL] API surface drift detected!" -ForegroundColor Red
  Write-Host "Routes present on disk but missing in allowlist:"
  $missing | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

Write-Host "[OK] No API surface drift detected." -ForegroundColor Green

