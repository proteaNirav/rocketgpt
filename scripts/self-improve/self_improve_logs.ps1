param(
    [int]$Limit = 1,
    [string]$RunId
)

$repo = "proteaNirav/rocketgpt"

Write-Host "`n=== Self-Improve · Logs ===`n"

if ($RunId) {
    # Direct mode: show logs for a specific run ID
    Write-Host "`n----------------------------------------"
    Write-Host "Run ID   : $RunId"
    Write-Host "Title    : (not fetched in this mode)"
    Write-Host "Branch   : (not fetched in this mode)"
    Write-Host "Event    : (not fetched in this mode)"
    Write-Host "Status   : (see log below)"
    Write-Host "Result   : (see log below)"
    Write-Host "Updated  : (see log below)"
    Write-Host "----------------------------------------`n"

    $logText = gh run view $RunId --repo $repo --log

    if ($logText) {
        Write-Host $logText
    }
    else {
        Write-Host "(No logs available or invalid Run ID)" -ForegroundColor Yellow
    }

    exit
}

# Default mode: latest N runs
$runs = gh run list --repo $repo `
    --workflow "self_improve.yml" `
    --limit $Limit `
    --json databaseId,displayTitle,conclusion,status,updatedAt,headBranch,event |
    ConvertFrom-Json

if (-not $runs) {
    Write-Host "No runs found." -ForegroundColor Yellow
    exit
}

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

    $logText = gh run view $run.databaseId --repo $repo --log

    if ($logText) {
        Write-Host $logText
    }
    else {
        Write-Host "(No logs available)" -ForegroundColor Yellow
    }
}
