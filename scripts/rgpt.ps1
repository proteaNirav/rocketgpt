param(
    [Parameter(Position=0)]
    [string]$Command = "help",

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

function Parse-LogsArgs {
    param([string[]]$Args)
    $result = [ordered]@{ RunId = $null; Limit = 1; LastFailed = $false }
    for ($i=0; $i -lt $Args.Count; $i++){
        switch ($Args[$i]){
            "--run"         { if ($i+1 -lt $Args.Count){ $result.RunId = $Args[++$i] } }
            "--limit"       { if ($i+1 -lt $Args.Count){ [int]$v=1; [void][int]::TryParse($Args[++$i],[ref]$v); $result.Limit=$v } }
            "--last-failed" { $result.LastFailed = $true }
        }
    }
    return $result
}

function Parse-RunsArgs {
    param([string[]]$Args)
    $result = [ordered]@{ Limit = 10 }
    for ($i=0; $i -lt $Args.Count; $i++){
        switch ($Args[$i]){
            "--limit" { if ($i+1 -lt $Args.Count){ [int]$v=10; [void][int]::TryParse($Args[++$i],[ref]$v); $result.Limit=$v } }
        }
    }
    return $result
}

function Parse-DeployArgs {
    param([string[]]$Args)
    $result = [ordered]@{ Wait = $false; Poll = 5 }
    for ($i=0; $i -lt $Args.Count; $i++){
        switch ($Args[$i]){
            "--wait" { $result.Wait = $true }
            "--poll" { if ($i+1 -lt $Args.Count){ [int]$v=5; [void][int]::TryParse($Args[++$i],[ref]$v); $result.Poll=$v } }
        }
    }
    return $result
}

switch ($Command.ToLower()) {
    "health"       { ./scripts/rgpt_health.ps1 }
    "self-status"  { ./scripts/self-improve/self_improve_status.ps1 }
    "self-current" { ./scripts/self-improve/self_improve_current.ps1 }
    "runs" {
        $opts = Parse-RunsArgs -Args $Args
        ./scripts/self-improve/self_improve_runs.ps1 -Limit $opts.Limit
    }
    "logs" {
        $opts = Parse-LogsArgs -Args $Args
        if ($opts.LastFailed) {
            $runs = gh run list --repo "proteaNirav/rocketgpt" `
                --workflow "self_improve.yml" --limit 25 `
                --json databaseId,displayTitle,conclusion,status,updatedAt | ConvertFrom-Json
            if (-not $runs) { Write-Host "No runs found." -ForegroundColor Yellow; break }
            if ($runs -isnot [array]) { $runs = @($runs) }
            $failed = $runs | Sort-Object updatedAt -Descending |
                      Where-Object { $_.status -eq "completed" -and $_.conclusion -ne "success" } |
                      Select-Object -First 1
            if (-not $failed) { Write-Host "No failed runs found in the recent 25 runs." -ForegroundColor Green; break }
            ./scripts/self-improve/self_improve_logs.ps1 -RunId $failed.databaseId
        }
        elseif ($opts.RunId) {
            ./scripts/self-improve/self_improve_logs.ps1 -RunId $opts.RunId
        }
        else {
            ./scripts/self-improve/self_improve_logs.ps1 -Limit $opts.Limit
        }
    }
    "deploy" {
        $opts = Parse-DeployArgs -Args $Args
        Write-Host "Triggering throttled deploy..." -ForegroundColor Cyan
        gh workflow run "Vercel Throttled Deploy" | Out-Null

        Start-Sleep -Seconds 3
        $r = gh run list --workflow "Vercel Throttled Deploy" --limit 1 --json databaseId,updatedAt | ConvertFrom-Json
        if (-not $r) { Write-Host "No run found — check GitHub." -ForegroundColor Yellow; break }
        $runId = $r[0].databaseId
        Write-Host "Run ID: $runId"

        if (-not $opts.Wait) { break }

        # Wait mode: poll until completed and print gate decision
        do {
          $j = gh run view $runId --json status,conclusion | ConvertFrom-Json
          $resultText = "(n/a)"
          if ($j -and $j.PSObject.Properties.Match("conclusion").Count -gt 0 -and $j.conclusion) { $resultText = $j.conclusion }
          Write-Host ("Status: {0}  Result: {1}" -f $j.status, $resultText)
          Start-Sleep -Seconds $opts.Poll
        } while ($j.status -ne "completed")

        Write-Host "`n--- Gate decision ---`n"
        gh run view $runId --log | Select-String -Pattern "Decide if deploy allowed", "Over 30 minutes", "Under 30 minutes", "Deploying to Vercel", "Skipping deploy"
    }
    "deploy-status" {
        if ($Args.Count -lt 1) {
            Write-Host "Usage: ./scripts/rgpt.ps1 deploy-status <RunId>" -ForegroundColor Yellow
            break
        }
        $runId = $Args[0]
        # wait until completed, then show decision lines
        do {
          $j = gh run view $runId --json status,conclusion | ConvertFrom-Json
          $resultText = "(n/a)"
          if ($j -and $j.PSObject.Properties.Match("conclusion").Count -gt 0 -and $j.conclusion) { $resultText = $j.conclusion }
          Write-Host ("Status: {0}  Result: {1}" -f $j.status, $resultText)
          if ($j.status -ne "completed") { Start-Sleep -Seconds 5 }
        } while ($j.status -ne "completed")

        Write-Host "`n--- Gate decision ---`n"
        gh run view $runId --log | Select-String -Pattern "Decide if deploy allowed", "Over 30 minutes", "Under 30 minutes", "Deploying to Vercel", "Skipping deploy"
    }
    "help" {
        Write-Host "`nRocketGPT CLI (rgpt.ps1)" -ForegroundColor Cyan
        Write-Host "Operate RocketGPT from PowerShell: health, runs, logs, deploy, and plan views.`n"
        Write-Host "USAGE:" -ForegroundColor Yellow
        Write-Host "  ./scripts/rgpt.ps1 health                 # Health snapshot (runs + plan + verdict)"
        Write-Host "  ./scripts/rgpt.ps1 runs [--limit N]       # Recent Self-Improve runs (table)"
        Write-Host "  ./scripts/rgpt.ps1 logs                   # Logs for the latest run"
        Write-Host "  ./scripts/rgpt.ps1 logs --run <RunId>     # Logs for a specific run"
        Write-Host "  ./scripts/rgpt.ps1 logs --limit N         # Logs for last N runs"
        Write-Host "  ./scripts/rgpt.ps1 logs --last-failed     # Logs for most recent failed run"
        Write-Host "  ./scripts/rgpt.ps1 deploy [--wait]        # Trigger throttled Vercel deploy (with 30m gate)"
        Write-Host "  ./scripts/rgpt.ps1 deploy-status <RunId>  # Wait + print gate decision for a throttled deploy run"
        return
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Try: ./scripts/rgpt.ps1 help"
        exit 1
    }
}
