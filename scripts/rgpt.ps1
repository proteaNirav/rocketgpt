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
        RunId = $null
        Limit = 1
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
        # Show recent Self-Improve runs in a table
        ./scripts/self-improve/self_improve_runs.ps1 -Limit 10
    }
    "logs" {
        $opts = Parse-LogsArgs -Args $Args

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
        Write-Host "  ./scripts/rgpt.ps1 health                 # Show overall RocketGPT self-improve health snapshot"
        Write-Host "  ./scripts/rgpt.ps1 self-status            # Show recent Self-Improve runs (compact view)"
        Write-Host "  ./scripts/rgpt.ps1 self-current           # Show active improvement + latest intent"
        Write-Host "  ./scripts/rgpt.ps1 runs                   # Show recent Self-Improve runs (detailed table)"
        Write-Host "  ./scripts/rgpt.ps1 logs                   # Show logs for the latest Self-Improve run"
        Write-Host "  ./scripts/rgpt.ps1 logs --run <RunId>     # Show logs for a specific Self-Improve run"
        Write-Host "  ./scripts/rgpt.ps1 logs --limit <number>  # Show logs for the last N Self-Improve runs"
        Write-Host ""
        return
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Try: ./scripts/rgpt.ps1 help"
        exit 1
    }
}
