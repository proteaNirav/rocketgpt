param(
    [int]$Limit = 1
)

$repo = "proteaNirav/rocketgpt"

Write-Host "`n=== Self-Improve · Logs ===`n"

# Get the last N runs
$runs = gh run list --repo $repo `
    --workflow "self_improve.yml" `
    --limit $Limit `
    --json databaseId,displayTitle,conclusion,status,updatedAt,headBranch,event |
    ConvertFrom-Json

if (-not $runs) {
    Write-Host "No runs found." -ForegroundColor Yellow
    exit
}

# Normalise to array
if ($runs -isnot [array]) {
    $runs = @($runs)
}

foreach ($run in $runs) {

    Write-Host "`n----------------------------------------"
    Write-Host "Run ID   : $($run.databaseId)"
    Write-Host "Title    : $($run.displayTitle)"
    Write-Host "Branch   : $($run.headBranch)"
    Write-Host "Event    : $($run.event)"
    Write-Host "Status   : $($run.status)"
    Write-Host "Result   : $($run.conclusion)"
    Write-Host "Updated  : $($run.updatedAt)"
    Write-Host "----------------------------------------`n"

    # Fetch and display logs
    $logText = gh run view $run.databaseId --repo $repo --log

    if ($logText) {
        Write-Host $logText
    }
    else {
        Write-Host "(No logs available)"
    }
}
