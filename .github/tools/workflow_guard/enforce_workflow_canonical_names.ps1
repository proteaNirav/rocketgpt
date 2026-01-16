param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest

$wfDir = Join-Path $RepoRoot ".github/workflows"
if (-not (Test-Path $wfDir)) { throw "Workflows dir not found: $wfDir" }

$canonicalFiles = @(
  "policy_gate.yml",
  "self_heal.yml",
  "self_improve.yml",
  "watchdog.yml",
  "auto_fix_policy.yml"
)

# Enforced top-level workflow names (stable identifiers)
$canonicalNames = @{
  "policy_gate.yml"      = "policy_gate"
  "self_heal.yml"        = "self_heal"
  "self_improve.yml"     = "self_improve"
  "watchdog.yml"         = "watchdog"
  "auto_fix_policy.yml"  = "auto_fix_policy"
}

# Explicitly banned historical drift filenames (now renamed)
$bannedFiles = @(
  "auto_update_policy.yml",
  "self_innovate.yml",
  "selfimprove_ingest_ci.yml",
  "self_heal_hooks.yml",
  "self-redev.yml"
)

function Get-YamlTopValue {
  param([string[]]$Lines, [string]$Key)
  $pattern = "^(?:$Key)\s*:\s*(.+?)\s*$"
  foreach ($ln in $Lines) {
    if ($ln -match '^\s{1,}') { continue } # only top-level
    if ($ln -match $pattern) { return ($Matches[1].Trim() -replace '^["'']|["'']$','') }
  }
  return $null
}

$errors = New-Object System.Collections.Generic.List[string]

# 1) Canonical files must exist
foreach ($f in $canonicalFiles) {
  $p = Join-Path $wfDir $f
  if (-not (Test-Path $p)) { $errors.Add("Missing canonical workflow file: .github/workflows/$f") }
}

# 2) Banned filenames must not exist
foreach ($f in $bannedFiles) {
  $p = Join-Path $wfDir $f
  if (Test-Path $p) { $errors.Add("Banned workflow filename present (drift): .github/workflows/$f") }
}

# 3) Canonical files must have correct top-level name:
foreach ($kv in $canonicalNames.GetEnumerator()) {
  $file = $kv.Key
  $expected = $kv.Value
  $p = Join-Path $wfDir $file
  if (-not (Test-Path $p)) { continue }

  $lines = Get-Content -LiteralPath $p
  $name = Get-YamlTopValue -Lines $lines -Key "name"
  if ([string]::IsNullOrWhiteSpace($name)) {
    $errors.Add("Canonical workflow missing top-level name: .github/workflows/$file (expected name: $expected)")
    continue
  }
  if ($name -ne $expected) {
    $errors.Add("Canonical workflow name drift: .github/workflows/$file has name='$name' but expected '$expected'")
  }
}

if ($errors.Count -gt 0) {
  Write-Host "WORKFLOW CANONICAL DRIFT LOCK: FAIL" -ForegroundColor Red
  foreach ($e in $errors) { Write-Host ("- " + $e) -ForegroundColor Red }
  exit 1
}

Write-Host "WORKFLOW CANONICAL DRIFT LOCK: OK" -ForegroundColor Green
