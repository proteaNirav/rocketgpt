param(
    [Parameter(Mandatory)]
    [string]$PlanPath
)

# ==========================================================
# RGPT-S2-B-05-PS-01 — Planner → Orchestrator Plan Validator
# ==========================================================
$ErrorActionPreference = "Stop"

if (-not (Test-Path $PlanPath)) {
    throw "Plan file not found: $PlanPath"
}

$plan = Get-Content $PlanPath -Raw | ConvertFrom-Json

Write-Host "[VALIDATE] Contract version..." -ForegroundColor Cyan
if (-not $plan.contract_version) { throw "Missing contract_version" }

Write-Host "[VALIDATE] Status..." -ForegroundColor Cyan
if ($plan.status -ne "APPROVED") {
    throw "Plan is not APPROVED"
}

Write-Host "[VALIDATE] Risk..." -ForegroundColor Cyan
if ($plan.risk.level -gt 3) {
    throw "Risk level > 3 is not executable"
}

if ($plan.risk.level -eq 3 -and -not $plan.approval.required) {
    throw "Risk=3 requires explicit approval"
}

Write-Host "[VALIDATE] Tasks..." -ForegroundColor Cyan
if (-not $plan.tasks -or $plan.tasks.Count -eq 0) {
    throw "No executable tasks found"
}

Write-Host "[VALIDATE] Scope lock..." -ForegroundColor Cyan
if (-not $plan.scope.allowed) {
    throw "Allowed scope not defined"
}

Write-Host "[OK] Plan validation passed" -ForegroundColor Green
exit 0
