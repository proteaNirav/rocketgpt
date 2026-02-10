# RGPT-E2-TIMELINE-VERIFY-PS-01
# Purpose: Validate RocketGPT Runtime Timeline (JSONL)
# Usage:
#   pwsh .\scripts\ops\Verify-RuntimeTimeline.ps1 -Path ".\runtime_timeline.jsonl"

param(
  [Parameter(Mandatory = $true)]
  [string]$Path
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Test-Path $Path)) {
  throw "File not found: $Path"
}

Write-Host "== Verifying Runtime Timeline ==" -ForegroundColor Cyan
Write-Host "File: $Path"

$lines = Get-Content -Path $Path -Encoding UTF8
if ($lines.Count -eq 0) {
  throw "Timeline file is empty."
}

$events = @()
$lineNo = 0

foreach ($line in $lines) {
  $lineNo++
  if ([string]::IsNullOrWhiteSpace($line)) { continue }

  try {
    $obj = $line | ConvertFrom-Json -Depth 50
  } catch {
    throw "Invalid JSON at line $lineNo"
  }

  # Required fields
  $required = @(
    "schema_version",
    "execution_id",
    "event_id",
    "sequence_no",
    "event_type",
    "layer",
    "event_time_utc",
    "actor_type",
    "authority",
    "status"
  )

  foreach ($r in $required) {
    if (-not ($obj.PSObject.Properties.Name -contains $r)) {
      throw "Missing required field '$r' at line $lineNo"
    }
  }

  if (-not $obj.authority.auth_context_hash) {
    throw "Missing authority.auth_context_hash at line $lineNo"
  }

  if (-not $obj.authority.policy_profile) {
    throw "Missing authority.policy_profile at line $lineNo"
  }

  $events += $obj
}

Write-Host "Parsed events: $($events.Count)" -ForegroundColor Green

# Check uniqueness of (execution_id, sequence_no)
$dupes = $events |
  Group-Object execution_id, sequence_no |
  Where-Object { $_.Count -gt 1 }

if ($dupes) {
  throw "Duplicate (execution_id, sequence_no) detected"
}

# Check monotonic sequence per execution
$byExecution = $events | Group-Object execution_id
foreach ($group in $byExecution) {
  $sorted = $group.Group | Sort-Object sequence_no
  $prev = 0
  foreach ($e in $sorted) {
    if ($e.sequence_no -le $prev) {
      throw "Non-monotonic sequence_no in execution_id=$($group.Name)"
    }
    $prev = $e.sequence_no
  }
}

Write-Host "Timeline validation PASSED ✅" -ForegroundColor Green
