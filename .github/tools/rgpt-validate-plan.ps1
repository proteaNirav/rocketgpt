[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$PlanJsonPath
)

$ErrorActionPreference = "Stop"

$schemaPath = "docs\planner\schemas\planner.v1\executionplan.schema.json"
$hashTool   = ".github\tools\rgpt-generate-plan-hash.ps1"

if (-not (Test-Path $PlanJsonPath)) {
  throw "ExecutionPlan.json not found: $PlanJsonPath"
}
if (-not (Test-Path $schemaPath)) {
  throw "Schema not found: $schemaPath"
}
if (-not (Test-Path $hashTool)) {
  throw "Hash tool not found: $hashTool"
}

# ---------- Basic schema validation ----------
$plan = Get-Content $PlanJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$required = @(
  "schema_version","plan_id","created_at","phase","status",
  "input_fingerprint","normalized_goal","scope_contract",
  "tasks","dependencies","risk_summary","approvals",
  "rollback_strategy","constraints","outputs","hash"
)

foreach ($r in $required) {
  if (-not ($plan.PSObject.Properties.Name -contains $r)) {
    throw "Schema validation failed: missing '$r'"
  }
}

Write-Host "[OK] Basic schema structure validated" -ForegroundColor Green

# ---------- Hash verification ----------
$temp = Join-Path $env:TEMP ("rgpt_plan_validate_" + [guid]::NewGuid() + ".json")
Copy-Item $PlanJsonPath $temp -Force

& $hashTool -PlanJsonPath $temp | Out-Null

$origHash = $plan.hash
$newHash  = (Get-Content $temp -Raw | ConvertFrom-Json).hash
Remove-Item $temp -Force

if ($origHash -ne $newHash) {
  throw "Hash mismatch. Stored=$origHash Computed=$newHash"
}

Write-Host "[OK] Hash verified and matches canonical form" -ForegroundColor Green
Write-Host "[PASS] Planner v1 ExecutionPlan is valid" -ForegroundColor Green
