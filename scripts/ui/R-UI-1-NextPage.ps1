param(
    [string]$Root = "$(Get-Location)"
)

Write-Host "`n[R-UI-1] NextPage backup scan starting..." -ForegroundColor Cyan
Write-Host "Root : $Root`n"

$AppRoot = Join-Path $Root "rocketgpt_v3_full\webapp\next\app"

function Backup-RgptPage {
    param(
        [string]$Name,
        [string]$RelativePath
    )

    $fullPath = Join-Path $AppRoot $RelativePath

    if (Test-Path $fullPath) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupPath = "$fullPath.bak-RUI1-$timestamp"

        Copy-Item -Path $fullPath -Destination $backupPath -Force

        Write-Host ("[OK] {0,-12} -> {1}" -f $Name, $RelativePath) -ForegroundColor Green
        Write-Host ("     Backup: {0}" -f (Split-Path $backupPath -Leaf)) -ForegroundColor DarkGray
    }
    else {
        Write-Warning ("[MISS] {0,-12} file not found at {1}" -f $Name, $RelativePath)
    }
}

# A) Dashboard (Home)
Backup-RgptPage -Name "Dashboard" -RelativePath "page.tsx"

# B) Sessions
Backup-RgptPage -Name "Sessions" -RelativePath "sessions\page.tsx"

# C) Prompts Library
Backup-RgptPage -Name "Prompts" -RelativePath "prompts\page.tsx"

# D) Runbooks
Backup-RgptPage -Name "Runbooks" -RelativePath "runbooks\page.tsx"

# E) Models Management
Backup-RgptPage -Name "Models" -RelativePath "models\page.tsx"

# F) Logs Viewer
Backup-RgptPage -Name "Logs" -RelativePath "logs\page.tsx"

# G) Plans & Limits
Backup-RgptPage -Name "Plans" -RelativePath "plans\page.tsx"

# H) Settings
Backup-RgptPage -Name "Settings" -RelativePath "settings\page.tsx"

Write-Host "`n[R-UI-1] Backup scan completed." -ForegroundColor Cyan
