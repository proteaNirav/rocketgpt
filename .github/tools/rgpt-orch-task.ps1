param(
  [Parameter(Mandatory)][string]$PlanPath,
  [Parameter(Mandatory)][string]$TaskId,
  [Parameter(Mandatory)][ValidateSet("START","END")][string]$Phase,
  [Parameter()][ValidateSet("SUCCESS","FAILED","SKIPPED")][string]$Status,
  [Parameter()][string]$Notes,
  [Parameter()][string]$CommitSha
)

# ==========================================================
# RGPT-S2-B-06-PS-02 — Orchestrator Task Evidence Writer
# ==========================================================
$ErrorActionPreference="Stop"

if (-not (Test-Path $PlanPath)) { throw "Plan not found: $PlanPath" }
$plan = Get-Content $PlanPath -Raw | ConvertFrom-Json
$planId = $plan.plan_id
if (-not $planId) { throw "plan_id missing in plan" }

$execDir = Join-Path "docs/ops/executions" $planId
$headerPath = Join-Path $execDir "EXECUTION_HEADER.json"
if (-not (Test-Path $headerPath)) {
  throw "Missing execution header. Run rgpt-orch-start.ps1 first."
}

$header = Get-Content $headerPath -Raw | ConvertFrom-Json
$lockedHash = $header.plan_sha256
$currentHash = (Get-FileHash -Algorithm SHA256 -Path $PlanPath).Hash
if ($lockedHash -ne $currentHash) {
  throw "Plan hash mismatch. Execution is LOCKED."
}

$task = $plan.tasks | Where-Object { $_.task_id -eq $TaskId } | Select-Object -First 1
if (-not $task) { throw "Task not found in plan: $TaskId" }

$taskPath = Join-Path $execDir ("TASK_{0}.json" -f $TaskId)
$existing = $null
if (Test-Path $taskPath) {
  $existing = Get-Content $taskPath -Raw | ConvertFrom-Json
}

$nowUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

if ($Phase -eq "START") {
  $out = @{
    contract_version = "S2-B-06.v1"
    plan_id          = $planId
    task_id          = $TaskId
    description      = $task.description
    started_at_utc   = $nowUtc
    notes            = $Notes
  }
} else {
  if (-not $Status) { throw "END requires -Status" }
  $out = @{
    contract_version = "S2-B-06.v1"
    plan_id          = $planId
    task_id          = $TaskId
    started_at_utc   = $existing.started_at_utc
    ended_at_utc     = $nowUtc
    status           = $Status
    notes            = $Notes
    commit_sha       = $CommitSha
  }
}

($out | ConvertTo-Json -Depth 10) | Out-File $taskPath -Encoding UTF8 -Force

Write-Host "[OK] Wrote task evidence: $taskPath" -ForegroundColor Green
