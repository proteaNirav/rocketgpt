param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

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
    "logs" {
        # Show logs for the latest Self-Improve run
        ./scripts/self-improve/self_improve_logs.ps1 -Limit 1
    }
    "runs" {
        # Show recent Self-Improve runs in a table
        ./scripts/self-improve/self_improve_runs.ps1 -Limit 10
    }
    "help" {
        Write-Host "`nRocketGPT CLI (rgpt.ps1)`n" -ForegroundColor Cyan
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  ./scripts/rgpt.ps1 health        # Show overall RocketGPT self-improve health snapshot"
        Write-Host "  ./scripts/rgpt.ps1 self-status   # Show recent Self-Improve runs (compact view)"
        Write-Host "  ./scripts/rgpt.ps1 self-current  # Show active improvement + latest intent"
        Write-Host "  ./scripts/rgpt.ps1 runs          # Show recent Self-Improve runs (detailed table)"
        Write-Host "  ./scripts/rgpt.ps1 logs          # Show logs for the latest Self-Improve run"
        Write-Host ""
        return
    }
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Write-Host "Try: ./scripts/rgpt.ps1 help"
        exit 1
    }
}
