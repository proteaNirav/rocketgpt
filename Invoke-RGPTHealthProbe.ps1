param(
    [string] $BaseUrl = "http://localhost:3000"
)

Write-Host "`n[RGPT-HEALTH] RocketGPT Health Probe starting..." -ForegroundColor Cyan

$StatusUrl      = "$BaseUrl/api/status"
$OrchHealthUrl  = "$BaseUrl/api/orchestrator/health"
$LogPath        = Join-Path $PSScriptRoot "RGPT-HealthProbe.log"

Write-Host "[RGPT-HEALTH] Target status URL : $StatusUrl" -ForegroundColor Gray
Write-Host "[RGPT-HEALTH] Orchestrator URL  : $OrchHealthUrl" -ForegroundColor Gray
Write-Host "[RGPT-HEALTH] Log file          : $LogPath" -ForegroundColor Gray

# Helper: safe JSON parse
function Convert-JsonSafe {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Content
    )
    try {
        return $Content | ConvertFrom-Json -ErrorAction Stop
    }
    catch {
        Write-Host "[RGPT-HEALTH] WARNING: Failed to parse JSON." -ForegroundColor Yellow
        return $null
    }
}

# ---------------------------------------------
# 1) Call /api/status (overall platform status)
# ---------------------------------------------
$statusJson = $null
$statusOk   = $false

try {
    $statusResponse = Invoke-WebRequest -Uri $StatusUrl -UseBasicParsing -ErrorAction Stop
    Write-Host "[RGPT-HEALTH] ✅ Status call succeeded." -ForegroundColor Green
    $statusJson = Convert-JsonSafe -Content $statusResponse.Content
    if ($statusJson -ne $null) {
        $statusOk = [bool]$statusJson.success
    }
}
catch {
    Write-Host "[RGPT-HEALTH] ❌ Status call failed: $($_.Exception.Message)" -ForegroundColor Red
}

if ($statusJson -ne $null) {
    Write-Host "[RGPT-HEALTH] success   : $($statusJson.success)" -ForegroundColor Gray

    if ($statusJson.services) {
        $services = @()
        foreach ($prop in $statusJson.services.PSObject.Properties) {
            $value = $prop.Value
            $services += [PSCustomObject]@{
                service = $prop.Name
                ok      = $value.ok
                status  = $value.status
            }
        }

        if ($services.Count -gt 0) {
            Write-Host "[RGPT-HEALTH] services  :" -ForegroundColor Gray
            $services | Format-Table -AutoSize | Out-String | Write-Host
        }
    }
}

# ----------------------------------------------------
# 2) Call /api/orchestrator/health (detailed health)
# ----------------------------------------------------
$orchJson       = $null
$orchHealthOk   = $false
$overallStatus  = "unknown"

try {
    $orchResponse = Invoke-WebRequest -Uri $OrchHealthUrl -UseBasicParsing -ErrorAction Stop
    Write-Host "[RGPT-HEALTH] ✅ Orchestrator health call succeeded." -ForegroundColor Green

    $orchJson = Convert-JsonSafe -Content $orchResponse.Content
    if ($orchJson -ne $null) {
        $orchHealthOk  = [bool]$orchJson.success
        $overallStatus = $orchJson.summary.overall_status
    }
}
catch {
    Write-Host "[RGPT-HEALTH] ❌ Orchestrator health call failed: $($_.Exception.Message)" -ForegroundColor Red
}

if ($orchJson -ne $null) {
    Write-Host "[RGPT-HEALTH] Orchestrator service  : $($orchJson.service)" -ForegroundColor Gray
    Write-Host "[RGPT-HEALTH] Orchestrator version  : $($orchJson.version)" -ForegroundColor Gray
    Write-Host "[RGPT-HEALTH] Environment           : $($orchJson.environment)" -ForegroundColor Gray
    Write-Host "[RGPT-HEALTH] Overall status        : $overallStatus" -ForegroundColor Gray
    Write-Host "[RGPT-HEALTH] Safe-Mode enabled     : $($orchJson.safe_mode.enabled)" -ForegroundColor Gray

    $healthy   = @($orchJson.summary.healthy_modules)   -join ", "
    $degraded  = @($orchJson.summary.degraded_modules)  -join ", "
    $down      = @($orchJson.summary.down_modules)      -join ", "

    Write-Host ""
    Write-Host "[RGPT-HEALTH] Module summary:" -ForegroundColor Cyan
    Write-Host "  Healthy   : $healthy"  -ForegroundColor Green

    if ($degraded) {
        Write-Host "  Degraded  : $degraded" -ForegroundColor Yellow
    } else {
        Write-Host "  Degraded  : (none)" -ForegroundColor Gray
    }

    if ($down) {
        Write-Host "  Down      : $down" -ForegroundColor Red
    } else {
        Write-Host "  Down      : (none)" -ForegroundColor Gray
    }

    # Detailed table
    if ($orchJson.health) {
        $moduleRows = @()
        foreach ($prop in $orchJson.health.PSObject.Properties) {
            $value = $prop.Value
            $moduleRows += [PSCustomObject]@{
                module  = $prop.Name
                ok      = $value.ok
                status  = $value.status
                error   = $value.error
                latency = $value.latency_ms
            }
        }

        Write-Host "`n[RGPT-HEALTH] Orchestrator modules:" -ForegroundColor Cyan
        $moduleRows | Format-Table -AutoSize | Out-String | Write-Host
    }
}

# ---------------------------------------------
# 3) Log to RGPT-HealthProbe.log
# ---------------------------------------------
try {
    $timeStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = [string]::Format(
        "{0} | status_ok={1} | orch_ok={2} | orch_overall={3} | safe_mode={4}",
        $timeStamp,
        $statusOk,
        $orchHealthOk,
        $overallStatus,
        $(if ($orchJson -ne $null) { $orchJson.safe_mode.enabled } else { $null })
    )

    Add-Content -Path $LogPath -Value $logLine
    Write-Host "`n[RGPT-HEALTH] Logged to: $LogPath" -ForegroundColor Gray
}
catch {
    Write-Host "[RGPT-HEALTH] WARNING: Failed to write log: $($_.Exception.Message)" -ForegroundColor Yellow
}
