param(
    [string]$PlanPath = "docs/self-improve/chat-intent-plan.md"
)

if (-not (Test-Path $PlanPath)) {
    Write-Host "Plan file not found at $PlanPath" -ForegroundColor Red
    exit 1
}

$lines = Get-Content -Path $PlanPath

$info = @{
    ImprovementId = "(unknown)"
    Title         = "(unknown)"
    Priority      = "(unknown)"
    Status        = "(unknown)"
    StartedAt     = "(unknown)"
    PlanGenerated = "(unknown)"
    LatestFrom    = "(unknown)"
    LatestAt      = "(unknown)"
    LatestIntent  = "(unknown)"
}

foreach ($line in $lines) {
    if ($line -match '^- \*\*Improvement ID:\*\* (.+)$')   { $info.ImprovementId = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*Title:\*\* (.+)$')        { $info.Title         = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*Priority:\*\* (.+)$')     { $info.Priority      = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*Status:\*\* (.+)$')       { $info.Status        = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*Started at:\*\* (.+)$')   { $info.StartedAt     = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*Plan generated at:\*\* (.+)$') { $info.PlanGenerated = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*From:\*\* (.+)$')         { $info.LatestFrom    = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*At:\*\* (.+)$')           { $info.LatestAt      = $Matches[1].Trim() }
    elseif ($line -match '^- \*\*Intent:\*\* (.+)$')       { $info.LatestIntent  = $Matches[1].Trim() }
}

Write-Host "`n=== Self-Improve · Active Improvement ===`n"

[pscustomobject]@{
    "Improvement ID"  = $info.ImprovementId
    "Title"           = $info.Title
    "Priority"        = $info.Priority
    "Status"          = $info.Status
    "Started At"      = $info.StartedAt
    "Plan Generated"  = $info.PlanGenerated
    "Latest From"     = $info.LatestFrom
    "Latest At"       = $info.LatestAt
    "Latest Intent"   = $info.LatestIntent
} | Format-List
