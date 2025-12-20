param(
  [Parameter(Mandatory=$true)][string]$SUPABASE_URL,
  [Parameter(Mandatory=$true)][string]$SUPABASE_SERVICE_ROLE_KEY,

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

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# RGPT-C2-GUARD:FORBIDDEN-BODY-KEYS
$__rgptForbiddenKeys = @('p_source','source','client')
function Assert-RgptNoForbiddenBodyKeys {
  param([hashtable]$Body)
  foreach ($k in $__rgptForbiddenKeys) {
    if ($Body.ContainsKey($k)) { throw "RGPT-S1-C2: Forbidden RPC body key detected: $k" }
  }
}

# --- Inputs
$SupabaseUrl = $SUPABASE_URL
$ServiceKey  = $SUPABASE_SERVICE_ROLE_KEY
if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) { throw "SUPABASE_URL is empty" }
if ([string]::IsNullOrWhiteSpace($ServiceKey))  { throw "SUPABASE_SERVICE_ROLE_KEY is empty" }

$rpcUrl = ($SupabaseUrl.TrimEnd("/") + "/rest/v1/rpc/rgpt_selfimprove_ingest_event")

# --- Payload (MUST match RPC signature)
$bodyObj = @{
  subsystem      = $Subsystem
  severity       = $Severity
  title          = $Title
  description    = $Description
  confidence     = $Confidence
  evidence_ref   = $EvidenceRef
  related_commit = $RelatedCommit
  related_pr     = $RelatedPR
  origin_ref     = $OriginRef
}

Assert-RgptNoForbiddenBodyKeys $bodyObj
$body = $bodyObj | ConvertTo-Json -Depth 6

$headers = @{
  "apikey"         = $ServiceKey
  "Authorization"  = "Bearer $ServiceKey"
  "Content-Type"   = "application/json"
  "Accept-Profile" = "public"
  "Content-Profile"= "public"
}

Write-Host "[RGPT] Ingesting CI Self-Improve event -> ledger" -ForegroundColor Cyan
Write-Host ("[RGPT] rpcUrl: {0}" -f $rpcUrl) -ForegroundColor DarkCyan

try {
  Invoke-RestMethod -Method Post -Uri $rpcUrl -Headers $headers -Body $body -UserAgent "rgpt-ci/1.0" | Out-Null
  Write-Host "[OK] Ledger row written." -ForegroundColor Green
}
catch {
  Write-Host "[FAILED] Ledger ingest rejected" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red

  $resp = $_.Exception.Response
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
  throw
}
