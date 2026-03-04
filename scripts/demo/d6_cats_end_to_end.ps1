<#
.SYNOPSIS
One-command CATS demo: registry API -> passport -> replay evidence.

.EXAMPLE
pwsh -File .\scripts\demo\d6_cats_end_to_end.ps1

.EXAMPLE
pwsh -File .\scripts\demo\d6_cats_end_to_end.ps1 -CatId RGPT-CAT-01 -Port 8080

.EXAMPLE
pwsh -File .\scripts\demo\d6_cats_end_to_end.ps1 -DenyReason expired
#>
[CmdletBinding()]
param(
    [string]$CatId = "RGPT-CAT-01",
    [int]$Port = 8080,
    [ValidateSet("expired", "digest", "registry", "passport")]
    [string]$DenyReason
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$CoreApiDir = Join-Path $RepoRoot "apps\core-api"

function Get-ListeningConnectionByPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$PortNumber
    )

    $connections = @(Get-NetTCPConnection -LocalPort $PortNumber -State Listen -ErrorAction SilentlyContinue)
    if ($connections.Count -gt 0) {
        return $connections[0]
    }
    return $null
}

function Resolve-RegistryPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$RequestedPort
    )

    $candidatePort = $RequestedPort
    while ($true) {
        $listener = Get-ListeningConnectionByPort -PortNumber $candidatePort
        if (-not $listener) {
            if ($candidatePort -ne $RequestedPort) {
                Write-Host "Using next free registry port $candidatePort."
            }
            return $candidatePort
        }

        $ownerPid = $listener.OwningProcess
        Write-Host "Port $candidatePort is in use by pid $ownerPid. Attempting to stop it..."
        try {
            Stop-Process -Id $ownerPid -Force -ErrorAction Stop
            Start-Sleep -Milliseconds 500
        } catch {
            Write-Host "Unable to stop pid $ownerPid on port ${candidatePort}: $($_.Exception.Message)"
        }

        if (-not (Get-ListeningConnectionByPort -PortNumber $candidatePort)) {
            Write-Host "Freed port $candidatePort by stopping pid $ownerPid."
            return $candidatePort
        }

        Write-Host "Port $candidatePort is still busy. Trying next port..."
        $candidatePort++
    }
}

$BaseUrl = "http://127.0.0.1:$Port"
$LoopbackBaseUrl = $BaseUrl

function Test-CatsRegistryHealth {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [string]$FallbackUrl
    )
    try {
        $null = Invoke-RestMethod -Uri "$Url/cats/registry" -Method Get -TimeoutSec 2
        return $true
    } catch {
        if ($FallbackUrl) {
            try {
                $null = Invoke-RestMethod -Uri "$FallbackUrl/cats/registry" -Method Get -TimeoutSec 2
                return $true
            } catch {
                return $false
            }
        }
        return $false
    }
}

function Wait-CatsRegistryHealth {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [string]$FallbackUrl,
        [int]$MaxAttempts = 20,
        [int]$DelaySeconds = 1
    )
    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if (Test-CatsRegistryHealth -Url $Url -FallbackUrl $FallbackUrl) {
            return $true
        }
        Start-Sleep -Seconds $DelaySeconds
    }
    return $false
}

function Ensure-CatsRegistryApi {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [string]$FallbackUrl,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDir,
        [int]$PortNumber
    )

    if (Test-CatsRegistryHealth -Url $Url -FallbackUrl $FallbackUrl) {
        Write-Host "Registry API already listening on port $PortNumber."
        return [pscustomobject]@{
            Process = $null
            Port    = $PortNumber
            BaseUrl = "http://127.0.0.1:$PortNumber"
        }
    }

    $ExpectedCoreApiDir = Join-Path $RepoRoot "apps\core-api"
    if ((Resolve-Path -LiteralPath $WorkingDir).Path -ne (Resolve-Path -LiteralPath $ExpectedCoreApiDir).Path) {
        Write-Host "Overriding uvicorn working directory to $ExpectedCoreApiDir"
        $WorkingDir = $ExpectedCoreApiDir
    }

    $resolvedPort = Resolve-RegistryPort -RequestedPort $PortNumber
    $resolvedBaseUrl = "http://127.0.0.1:$resolvedPort"
    $Url = $resolvedBaseUrl
    $FallbackUrl = $resolvedBaseUrl

    $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $logPrefix = Join-Path ([System.IO.Path]::GetTempPath()) "cats_registry_uvicorn_${resolvedPort}_$stamp"
    $stdoutLog = "${logPrefix}.stdout.log"
    $stderrLog = "${logPrefix}.stderr.log"

    Write-Host "Starting registry API via uvicorn on port $resolvedPort..."
    $proc = Start-Process -FilePath "python" `
        -ArgumentList @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$resolvedPort") `
        -WorkingDirectory $WorkingDir `
        -PassThru `
        -RedirectStandardOutput $stdoutLog `
        -RedirectStandardError $stderrLog

    if (-not (Wait-CatsRegistryHealth -Url $Url -FallbackUrl $FallbackUrl -MaxAttempts 25 -DelaySeconds 1)) {
        $procId = if ($proc) { $proc.Id } else { "unknown" }
        Write-Host "Registry API health-check failed. Showing first 30 log lines."
        if (Test-Path -LiteralPath $stdoutLog) {
            Write-Host "---- stdout (first 30 lines) ----"
            Get-Content -LiteralPath $stdoutLog -TotalCount 30 | ForEach-Object { Write-Host $_ }
        } else {
            Write-Host "---- stdout ----"
            Write-Host "(log file not found)"
        }
        if (Test-Path -LiteralPath $stderrLog) {
            Write-Host "---- stderr (first 30 lines) ----"
            Get-Content -LiteralPath $stderrLog -TotalCount 30 | ForEach-Object { Write-Host $_ }
        } else {
            Write-Host "---- stderr ----"
            Write-Host "(log file not found)"
        }
        throw "Registry API failed health-check on $Url/cats/registry. pid=$procId stdout=$stdoutLog stderr=$stderrLog"
    }

    Write-Host "Registry API started (pid=$($proc.Id))."
    Write-Host "uvicorn stdout: $stdoutLog"
    Write-Host "uvicorn stderr: $stderrLog"
    return [pscustomobject]@{
        Process = $proc
        Port    = $resolvedPort
        BaseUrl = $resolvedBaseUrl
    }
}

function Show-EndpointJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [string]$FallbackUrl
    )
    Write-Host ""
    Write-Host "GET $Url"
    try {
        $payload = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
    } catch {
        if (-not $FallbackUrl) { throw }
        Write-Host "Primary URL failed; retrying via $FallbackUrl"
        $payload = Invoke-RestMethod -Uri $FallbackUrl -Method Get -TimeoutSec 10
    }
    $payload | ConvertTo-Json -Depth 100
}

function Invoke-CatsReplay {
    param(
        [Parameter(Mandatory = $true)]
        [string]$CoreDir,
        [Parameter(Mandatory = $true)]
        [string]$ReplayCatId,
        [string]$ReplayDenyReason
    )

    $cmdArgs = @(".\cats_demo_replay.py", $ReplayCatId)
    $label = "normal"
    if ($ReplayDenyReason) {
        $cmdArgs += @("--deny", $ReplayDenyReason)
        $label = "forced-denial:$ReplayDenyReason"
    }

    Write-Host ""
    Write-Host "Replay run ($label): python $($cmdArgs -join ' ')"

    Push-Location $CoreDir
    try {
        $lines = @(& python @cmdArgs 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        Pop-Location
    }

    foreach ($line in $lines) {
        $text = [string]$line
        if ($text.Length -gt 0) {
            Write-Host $text
        }
    }

    if ($exitCode -ne 0) {
        throw "Replay command failed ($label) with exit code $exitCode."
    }

    $artifactPaths = New-Object System.Collections.Generic.List[string]
    $renewalPaths = New-Object System.Collections.Generic.List[string]
    foreach ($line in $lines) {
        $text = [string]$line
        if ($text -match "CATS demo artifact:\s*(.+)$") {
            $artifactPaths.Add($matches[1].Trim())
        }
        if ($text -match '"renewal_request_artifact_path"\s*:\s*"([^"]+)"') {
            $renewalPaths.Add($matches[1])
        }
    }

    [pscustomobject]@{
        Label         = $label
        ArtifactPaths = @($artifactPaths)
        RenewalPaths  = @($renewalPaths | Select-Object -Unique)
    }
}

Write-Host "Repo root: $RepoRoot"
Write-Host "CAT ID: $CatId"
Write-Host "Registry base URL: $BaseUrl"

$registry = Ensure-CatsRegistryApi -Url $BaseUrl -FallbackUrl $LoopbackBaseUrl -WorkingDir $CoreApiDir -PortNumber $Port
$Port = $registry.Port
$BaseUrl = $registry.BaseUrl
$LoopbackBaseUrl = $BaseUrl

Show-EndpointJson -Url "$BaseUrl/cats/registry" -FallbackUrl "$LoopbackBaseUrl/cats/registry"
Show-EndpointJson -Url "$BaseUrl/cats/$CatId/passport" -FallbackUrl "$LoopbackBaseUrl/cats/$CatId/passport"
Show-EndpointJson -Url "$BaseUrl/cats/$CatId/definition" -FallbackUrl "$LoopbackBaseUrl/cats/$CatId/definition"

$runs = New-Object System.Collections.Generic.List[object]
$runs.Add((Invoke-CatsReplay -CoreDir $CoreApiDir -ReplayCatId $CatId))

if ($DenyReason) {
    $runs.Add((Invoke-CatsReplay -CoreDir $CoreApiDir -ReplayCatId $CatId -ReplayDenyReason $DenyReason))
}

$allArtifacts = @()
$allRenewals = @()
foreach ($run in $runs) {
    if ($run.ArtifactPaths) {
        $allArtifacts += $run.ArtifactPaths
    }
    if ($run.RenewalPaths) {
        $allRenewals += $run.RenewalPaths
    }
}
$allRenewals = @($allRenewals | Select-Object -Unique)

Write-Host ""
Write-Host "Final summary"
foreach ($run in $runs) {
    if ($run.ArtifactPaths.Count -gt 0) {
        Write-Host ("- {0} artifact(s): {1}" -f $run.Label, ($run.ArtifactPaths -join ", "))
    } else {
        Write-Host ("- {0} artifact(s): none detected" -f $run.Label)
    }
    if ($run.RenewalPaths.Count -gt 0) {
        Write-Host ("- {0} renewal artifact(s): {1}" -f $run.Label, ($run.RenewalPaths -join ", "))
    }
}

if ($allArtifacts.Count -gt 0) {
    Write-Host ("Latest artifact path: {0}" -f $allArtifacts[-1])
} else {
    Write-Host "Latest artifact path: (not found in replay output)"
}

if ($allRenewals.Count -gt 0) {
    Write-Host ("Renewal artifact paths: {0}" -f ($allRenewals -join ", "))
}
