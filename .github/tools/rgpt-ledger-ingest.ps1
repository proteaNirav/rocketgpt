param(
  [Parameter(Mandatory=$true)][string]$Subsystem,
  [Parameter(Mandatory=$true)][ValidateSet("low","medium","high","critical")][string]$Severity,
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$Description,
  [Parameter(Mandatory=$true)][double]$Confidence,
  [Parameter()][string]$EvidenceRef,
  [Parameter()][string]$RelatedCommit,
  [Parameter()][string]$RelatedPR,
  [Parameter()][string]$OriginRef
)

function Fail($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; throw $msg }

$SupabaseUrl = $env:SUPABASE_URL
$ServiceKey  = $env:SUPABASE_SERVICE_ROLE_KEY

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) { Fail "SUPABASE_URL missing" }
if ([string]::IsNullOrWhiteSpace($ServiceKey))  { Fail "SUPABASE_SERVICE_ROLE_KEY missing" }

$rpcUrl = ($SupabaseUrl.TrimEnd("/") + "/rest/v1/rpc/rgpt_selfimprove_ingest_event")

$body = @{
  subsystem      = $Subsystem
  severity       = $Severity
  title          = $Title
  description    = $Description
  confidence     = $Confidence
  evidence_ref   = $EvidenceRef
  related_commit = $RelatedCommit
  related_pr     = $RelatedPR
  origin_ref     = $OriginRef
} | ConvertTo-Json -Depth 6

$headers = @{
  "apikey"        = $ServiceKey
  "Authorization" = "Bearer $ServiceKey"
  "Content-Type"  = "application/json"
  "Accept-Profile"  = "public"
  "Content-Profile" = "public"
}
Write-Host "[RGPT] Ingesting CI Self-Improve event -> ledger" -ForegroundColor Cyan
try {
  Write-Host ("[RGPT] rpcUrl: {0}" -f $rpcUrl) -ForegroundColor DarkCyan
  Write-Host ("[RGPT] Profiles: Accept={0} Content={1}" -f $headers["Accept-Profile"], $headers["Content-Profile"]) -ForegroundColor DarkCyan
  Invoke-RestMethod -Method Post -Uri $rpcUrl -Headers $headers -Body $body -UserAgent "rgpt-ci/1.0" | Out-Null
}
catch {
  Write-Host "[FAILED] Ledger ingest rejected" -ForegroundColor Red
  Write-Host param(
  [Parameter(Mandatory=$true)][string]$Subsystem,
  [Parameter(Mandatory=$true)][ValidateSet("low","medium","high","critical")][string]$Severity,
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$Description,
  [Parameter(Mandatory=$true)][double]$Confidence,
  [Parameter()][string]$EvidenceRef,
  [Parameter()][string]$RelatedCommit,
  [Parameter()][string]$RelatedPR,
  [Parameter()][string]$OriginRef
)

function Fail($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; throw $msg }

$SupabaseUrl = $env:SUPABASE_URL
$ServiceKey  = $env:SUPABASE_SERVICE_ROLE_KEY

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) { Fail "SUPABASE_URL missing" }
if ([string]::IsNullOrWhiteSpace($ServiceKey))  { Fail "SUPABASE_SERVICE_ROLE_KEY missing" }

$rpcUrl = ($SupabaseUrl.TrimEnd("/") + "/rest/v1/rpc/rgpt_selfimprove_ingest_event")

$body = @{
  subsystem      = $Subsystem
  severity       = $Severity
  title          = $Title
  description    = $Description
  confidence     = $Confidence
  evidence_ref   = $EvidenceRef
  related_commit = $RelatedCommit
  related_pr     = $RelatedPR
  origin_ref     = $OriginRef
} | ConvertTo-Json -Depth 6

$headers = @{
  "apikey"        = $ServiceKey
  "Authorization" = "Bearer $ServiceKey"
  "Content-Type"  = "application/json"
  "Accept-Profile"  = "public"
  "Content-Profile" = "public"
}
Write-Host "[RGPT] Ingesting CI Self-Improve event -> ledger" -ForegroundColor Cyan
Invoke-RestMethod -Method Post -Uri $rpcUrl -Headers $headers -Body $body -UserAgent "rgpt-ci/1.0" | Out-Null
Write-Host "[OK] Ledger row written." -ForegroundColor Green
.Exception.Message -ForegroundColor Red

  $resp = param(
  [Parameter(Mandatory=$true)][string]$Subsystem,
  [Parameter(Mandatory=$true)][ValidateSet("low","medium","high","critical")][string]$Severity,
  [Parameter(Mandatory=$true)][string]$Title,
  [Parameter(Mandatory=$true)][string]$Description,
  [Parameter(Mandatory=$true)][double]$Confidence,
  [Parameter()][string]$EvidenceRef,
  [Parameter()][string]$RelatedCommit,
  [Parameter()][string]$RelatedPR,
  [Parameter()][string]$OriginRef
)

function Fail($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; throw $msg }

$SupabaseUrl = $env:SUPABASE_URL
$ServiceKey  = $env:SUPABASE_SERVICE_ROLE_KEY

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) { Fail "SUPABASE_URL missing" }
if ([string]::IsNullOrWhiteSpace($ServiceKey))  { Fail "SUPABASE_SERVICE_ROLE_KEY missing" }

$rpcUrl = ($SupabaseUrl.TrimEnd("/") + "/rest/v1/rpc/rgpt_selfimprove_ingest_event")

$body = @{
  subsystem      = $Subsystem
  severity       = $Severity
  title          = $Title
  description    = $Description
  confidence     = $Confidence
  evidence_ref   = $EvidenceRef
  related_commit = $RelatedCommit
  related_pr     = $RelatedPR
  origin_ref     = $OriginRef
} | ConvertTo-Json -Depth 6

$headers = @{
  "apikey"        = $ServiceKey
  "Authorization" = "Bearer $ServiceKey"
  "Content-Type"  = "application/json"
  "Accept-Profile"  = "public"
  "Content-Profile" = "public"
}
Write-Host "[RGPT] Ingesting CI Self-Improve event -> ledger" -ForegroundColor Cyan
Invoke-RestMethod -Method Post -Uri $rpcUrl -Headers $headers -Body $body -UserAgent "rgpt-ci/1.0" | Out-Null
Write-Host "[OK] Ledger row written." -ForegroundColor Green
.Exception.Response
  if ($resp -ne $null) {
    try {
      $status = [int]$resp.StatusCode
      Write-Host ("[HTTP] Status: {0}" -f $status) -ForegroundColor Yellow

      $stream = $resp.GetResponseStream()
      if ($stream -ne $null) {
        $reader = New-Object System.IO.StreamReader($stream)
        $serverBody = $reader.ReadToEnd()
        if ($serverBody) {
          Write-Host "`n[SERVER BODY]" -ForegroundColor Yellow
          Write-Host $serverBody
        }
      }
    } catch {
      Write-Host "[WARN] Could not read HTTP response body." -ForegroundColor Yellow
    }
  }

  exit 1
}
Write-Host "[OK] Ledger row written." -ForegroundColor Green
