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

# --- Canonical HTTP ingest wrapper (RGPT-S1-C4)
$httpStatus = 0
$httpBody   = ""

try {
  # Use Invoke-WebRequest so we can always read StatusCode + Body
  $resp = Invoke-WebRequest `
    -Method Post `
    -Uri $rpcUrl `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json" `
    -UserAgent "rgpt-ci/1.0"

  $httpStatus = [int]$resp.StatusCode
  $httpBody   = $resp.Content
}
catch {
  $ex = $_.Exception
  $httpStatus = 0
  $httpBody   = ""

  # If HTTP-layer exception, attempt to read response
  if ($ex -is [System.Net.WebException] -and $ex.Response) {
    try {
      $r = $ex.Response
      $httpStatus = [int]$r.StatusCode

      $sr = New-Object System.IO.StreamReader($r.GetResponseStream())
      $httpBody = $sr.ReadToEnd()
      $sr.Close()
    } catch {
      $httpBody = ""
    }
  } else {
    # Non-HTTP failure (bad URI, DNS, TLS, etc.)
    $httpBody = $ex.Message
  }
}
finally {
  Write-Host ("[HTTP] Status: {0}" -f $httpStatus) -ForegroundColor Yellow

  if (-not [string]::IsNullOrWhiteSpace($httpBody)) {
    $preview = $httpBody
    if ($preview.Length -gt 1200) { $preview = $preview.Substring(0,1200) + " ..." }
    Write-Host "[HTTP] Body:" -ForegroundColor Yellow
    Write-Host $preview
  } else {
    Write-Host "[HTTP] Body: <empty>" -ForegroundColor Yellow
  }
}

if ($httpStatus -lt 200 -or $httpStatus -ge 300) {
  throw "[FAILED] Ledger ingest rejected (HTTP $httpStatus)"
}

Write-Host "[OK] Ledger row written." -ForegroundColor Green
