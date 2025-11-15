param(
    [Parameter(Position=0)]
    [string]$Command = "help",

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
)

function Parse-LogsArgs {
    param(
        [string[]]$Args
    )

    $result = [ordered]@{
        RunId      = $null
        Limit      = 1
        LastFailed = $false
    }

    for ($i = 0; $i -lt $Args.Count; $i++) {
        switch ($Args[$i]) {
            "--run" {
                if ($i + 1 -lt $Args.Count) {
                    $result.RunId = $Args[$i + 1]
                    $i++
                }
            }
            "--limit" {
                if ($i + 1 -lt $Args.Count) {
                    [int]$limitVal = 1
                    if ([int]::TryParse($Args[$i + 1], [ref]$limitVal)) {
                        $result.Limit = $limitVal
                    }
                    $i++
                }
            }
            "--last-failed" {
                $result.LastFailed = $true
            }
        }
    }

    return $result
}

switch ($Command.ToLower()) {
    "health" {
        ./scripts/rgpt_health.ps1
    }
    "self-status" {
        ./scripts/self-improve/self_improve_status.ps1
    }
    "self-current" {
        ./scripts/self-improve/self_improve_current.ps1
    }
    "runs" {
        ./scripts/self-improve/self_improve_runs.ps1 -Limit 10
    }
    "logs" {
        $opts = Parse-LogsArgs -Args $Args

        if ($opts.LastFailed) {
            # Find the most recent failed/completed!=success run (look back up to 25 runs)
            $runs = gh run list --repo "proteaNirav/rocketgpt" `
                --workflow "self_improve.yml" `
                --limit 25 `
                --json databaseId,displayTitle,conclusion,status,updatedAt |
                ConvertFrom-Json

            if (-not $runs) {
                Write-Host "No runs found." -ForegroundColor Yellow
                exit 1
            }
            if ($runs -isnot [array]) { $runs = @($runs) }

            $failed = $runs |
              Sort-Object updatedAt -Descending |
              Where-Object { $_.status -eq "completed" -and $_.conclusion -ne "success" } |
              Select-Object -First 1

            if (-not $failed) {
                Write-Host "No failed runs found in the recent 25 runs." -ForegroundColor Green
                exit 0
            }

            ./scripts/self-improve/self_improve_logs.ps1 -RunId $failed.databaseId
            break
        }

        if ($opts.RunId) {
            ./scripts/self-improve/self_improve_logs.ps1 -RunId $opts.RunId
        }
        else {
            ./scripts/self-improve/self_improve_logs.ps1 -Limit $opts.Limit
        }
    }
    "help" {
        Write-Host "`nRocketGPT CLI (rgpt.ps1)`n" -ForegroundColor Cyan
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  ./scripts/rgpt.ps1 health                   # Health snapshot"
        Write-Host "  ./scripts/rgpt.ps1 self-status              # Recent runs (compact)"
        Write-Host "  ./scripts/rgpt.ps1 self-current             # Active improvement + latest intent"
        Write-Host "  ./scripts/rgpt.ps1 runs                     # Recent runs (table)"
        Write-Host "  ./scripts/rgpt.ps1 logs                     # Logs for latest run"
        Write-Host "  ./scripts/rgpt.ps1 logs --run <RunId>       # Logs for a specific run"
        Write-Host "  ./scripts/rgpt.ps1 logs --limit <number>    # Logs for last N runs"
        Write-Host "  ./scripts/rgpt.ps1 logs --last-failed       # Logs for most recent failed run"
        Write-Host ""
        return
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Try: ./scripts/rgpt.ps1 help"
        exit 1
    }
}
