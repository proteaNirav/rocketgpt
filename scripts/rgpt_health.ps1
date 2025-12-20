Write-Host "`n==========================="
Write-Host " RocketGPT Health Snapshot "
Write-Host "===========================`n"

# -------------------------------
#     Section 1: Recent Runs
# -------------------------------
Write-Host ">> Recent Self-Improve Runs" -ForegroundColor Cyan

./scripts/self-improve/self_improve_status.ps1 -Limit 5

# -------------------------------
#     Section 2: Active Plan
# -------------------------------
Write-Host "`n>> Active Improvement" -ForegroundColor Cyan

./scripts/self-improve/self_improve_current.ps1

# -------------------------------
#     Section 3: Verdict
# -------------------------------

Write-Host "`n>> Verdict" -ForegroundColor Cyan

$latestRun = gh run list --repo "proteaNirav/rocketgpt" `
  --workflow "self_improve.yml" `
  --limit 1 `
  --json conclusion,status |
  ConvertFrom-Json

if (-not $latestRun) {
    Write-Host "No runs found — health UNKNOWN" -ForegroundColor Yellow
    exit
}

$latest = $latestRun

if ($latest.status -eq "completed" -and $latest.conclusion -eq "success") {
    Write-Host "? RocketGPT Self-Improve is Healthy" -ForegroundColor Green
}
elseif ($latest.status -eq "completed" -and $latest.conclusion -ne "success") {
    Write-Host "? Self-Improve completed but failed — needs attention" -ForegroundColor Yellow
}
else {
    Write-Host "? Self-Improve is in a bad state" -ForegroundColor Red
}
