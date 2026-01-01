param(
  [Parameter(Mandatory=$false)]
  [string]$RawPath = "docs/security/dependabot/RGPT-S2-C-04-inventory.raw.json",

  [Parameter(Mandatory=$false)]
  [string]$TriagePath = "docs/security/dependabot/RGPT-S2-C-04-triage.open.json"
)

$ErrorActionPreference="Stop"

# Resolve relative paths from repo root (script location -> repo root = 2 levels up)
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot   = Resolve-Path (Join-Path $scriptRoot "..\..") | Select-Object -ExpandProperty Path
Set-Location $repoRoot

if (-not (Test-Path $RawPath)) { throw "Missing raw inventory: $RawPath" }

$items = Get-Content $RawPath -Raw | ConvertFrom-Json
$open  = @($items | Where-Object { $_.state -eq "open" })

$triage = $open | ForEach-Object {
  $patched = @($_.security_vulnerability.first_patched_version.identifier) | Where-Object { $_ -and $_.Trim() -ne "" }
  $hasPatch = ($patched.Count -gt 0)

  $rec = if ($hasPatch) { "auto_fix" } else { "accept_risk" }   # <-- valid in all PS versions

  [pscustomobject]@{
    number     = $_.number
    severity   = $_.security_vulnerability.severity
    ecosystem  = $_.dependency.package.ecosystem
    package    = $_.dependency.package.name
    manifest   = $_.dependency.manifest_path
    scope      = $_.dependency.scope
    ghsa_id    = $_.security_advisory.ghsa_id
    cve_id     = $_.security_advisory.cve_id
    summary    = $_.security_advisory.summary
    has_patch  = $hasPatch
    patched_in = $patched
    vulnerable_version_range = $_.security_vulnerability.vulnerable_version_range
    recommended_action = $rec
    owner_decision = ""
    justification  = ""
    expires_on     = ""
  }
} | Sort-Object severity, ecosystem, package, number

$triage | ConvertTo-Json -Depth 8 | Out-File $TriagePath -Encoding utf8

Write-Host "[OK] Wrote triage -> $TriagePath" -ForegroundColor Green
Write-Host "[INFO] Triage rows: $($triage.Count)" -ForegroundColor Yellow

# Compact severity counts (no -join precedence issue)
$counts = $triage | Group-Object severity | Sort-Object Name
$parts  = @($counts | ForEach-Object { "{0}={1}" -f $_.Name, $_.Count })
Write-Host ("[INFO] Triage by severity: " + ($parts -join ", ")) -ForegroundColor Yellow
