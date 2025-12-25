param(
  [switch]$VerboseMode
)

Write-Host "🚀 RocketGPT Self-Heal Probe (repo-safe) starting..."
Write-Host "Repo: $env:GITHUB_REPOSITORY"
Write-Host "SHA : $env:GITHUB_SHA"
Write-Host "Ref : $env:GITHUB_REF"

# 1) Verify critical files exist
$required = @(
  ".github/auto-ops.yml",
  ".github/workflows/policy_gate.yml",
  ".rocketgpt/safety/ruleset.json",
  ".github/CODEOWNERS"
)
$missing = @()
foreach ($f in $required) { if (-not (Test-Path $f)) { $missing += $f } }
if ($missing.Count -gt 0) {
  Write-Error ("Missing critical files:`n - " + ($missing -join "`n - "))
  exit 2
}

# 2) Quick JSON sanity for ruleset
try {
  $rules = Get-Content ".rocketgpt/safety/ruleset.json" -Raw | ConvertFrom-Json
  if (-not $rules.version) { throw "ruleset.version not found" }
  Write-Host "✅ ruleset.json parsed; version=$($rules.version)"
} catch {
  Write-Error "ruleset.json invalid: $($_.Exception.Message)"
  exit 3
}

# 3) Check branch protection (informational; non-blocking)
try {
  $bp = gh api "repos/$env:GITHUB_REPOSITORY/branches/main/protection" 2>$null | ConvertFrom-Json
  if ($bp.required_status_checks -and $bp.required_linear_history.enabled) {
    Write-Host "✅ Branch protection present (status checks + linear history)."
  } else {
    Write-Warning "⚠ Branch protection not as expected."
  }
} catch { Write-Warning "⚠ Could not read branch protection via gh api." }

# 4) Summarize PR checks (if running in PR)
if ($env:GITHUB_REF -like "refs/pull/*") {
  $prNum = ($env:GITHUB_REF -split "/")[2]
  Write-Host "Inspecting checks for PR #$prNum ..."
  gh pr checks $prNum -R $env:GITHUB_REPOSITORY | Out-Host
}

Write-Host "✅ Probe completed without repo writes."
exit 0
