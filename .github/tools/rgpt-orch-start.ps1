param(
  [Parameter(Mandatory)][string]$PlanPath
)

# ==========================================================
# RGPT-S2-B-06-PS-01 — Orchestrator Execution Envelope Start
# ==========================================================
$ErrorActionPreference="Stop"

$repoRoot = (Get-Location).Path
if (-not (Test-Path $PlanPath)) { throw "Plan not found: $PlanPath" }

# 1) Validate
Write-Host "[STEP] Validate plan..." -ForegroundColor Cyan
pwsh .github/tools/rgpt-plan-validate.ps1 -PlanPath $PlanPath

# 2) Load plan
$plan = Get-Content $PlanPath -Raw | ConvertFrom-Json
$planId = $plan.plan_id
if (-not $planId) { throw "plan_id missing in plan" }

# 3) Hash lock
Write-Host "[STEP] Compute plan hash..." -ForegroundColor Cyan
$hash = (Get-FileHash -Algorithm SHA256 -Path $PlanPath).Hash

# 4) Evidence folder
$execDir = Join-Path "docs/ops/executions" $planId
New-Item -ItemType Directory -Force -Path $execDir | Out-Null

# 5) Write header
$headerPath = Join-Path $execDir "EXECUTION_HEADER.json"
$header = @{
  contract_version = "S2-B-06.v1"
  plan_id          = $planId
  goal_id          = $plan.goal_id
  plan_path        = $PlanPath
  plan_sha256      = $hash
  started_at_utc   = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
  state            = "LOCKED"
  host             = $env:COMPUTERNAME
  user             = $env:USERNAME
}
($header | ConvertTo-Json -Depth 10) | Out-File $headerPath -Encoding UTF8

Write-Host "[OK] Execution envelope initialized" -ForegroundColor Green
Write-Host "     Plan: $PlanPath" -ForegroundColor DarkGray
Write-Host "     Evidence: $execDir" -ForegroundColor DarkGray
Write-Host "     Header: $headerPath" -ForegroundColor DarkGray

# 6) Print next tasks
Write-Host "`n[NEXT] Tasks in this plan:" -ForegroundColor Cyan
$plan.tasks | ForEach-Object {
  Write-Host (" - {0}: {1}" -f $_.task_id, $_.description)
}
