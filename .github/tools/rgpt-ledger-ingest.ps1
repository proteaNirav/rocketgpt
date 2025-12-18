param(
  [Parameter(Mandatory=$true)][string]$Phase,
  [Parameter(Mandatory=$true)][ValidateSet("ci","orchestrator")][string]$Source,
  [Parameter(Mandatory=$true)][string]$Subsystem,
  [Parameter(Mandatory=$true)][string]$SignalType,
  [Parameter(Mandatory=$true)][ValidateSet("low","medium","high","critical")][string]$Severity,
  [Parameter(Mandatory=$true)][string]$Summary,
  [Parameter(Mandatory=$true)][string]$Recommendation,
  [Parameter(Mandatory=$true)][double]$Confidence,
  [Parameter(Mandatory=$true)][string]$OriginRef,
  [Parameter()][hashtable]$Evidence = @{}
)

function Fail($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red; exit 1 }

$SupabaseUrl = $env:SUPABASE_URL
$ServiceKey  = $env:SUPABASE_SERVICE_ROLE_KEY

if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) { Fail "SUPABASE_URL is missing in env." }
if ([string]::IsNullOrWhiteSpace($ServiceKey))  { Fail "SUPABASE_SERVICE_ROLE_KEY is missing in env." }

$rpcUrl = ($SupabaseUrl.TrimEnd("/") + "/rest/v1/rpc/rgpt_ingest_selfimprove_event")

# Ensure evidence is JSONB-friendly
$evidenceObj = @{
  files   = @()
  logs    = @()
  metrics = @{}
}
if ($Evidence.ContainsKey("files"))   { $evidenceObj.files   = $Evidence.files }
if ($Evidence.ContainsKey("logs"))    { $evidenceObj.logs    = $Evidence.logs }
if ($Evidence.ContainsKey("metrics")) { $evidenceObj.metrics = $Evidence.metrics }

$body = @{
  p_phase          = $Phase
  p_source         = $Source
  p_subsystem      = $Subsystem
  p_signal_type    = $SignalType
  p_severity       = $Severity
  p_summary        = $Summary
  p_evidence       = $evidenceObj
  p_recommendation = $Recommendation
  p_confidence     = $Confidence
  p_origin_ref     = $OriginRef
} | ConvertTo-Json -Depth 10

$headers = @{
  "apikey"        = $ServiceKey
  "Authorization" = "Bearer $ServiceKey"
  "Content-Type"  = "application/json"
}

Write-Host "[RGPT] Ingesting Self-Improve event -> ledger (RPC)..." -ForegroundColor Cyan
Write-Host "[RGPT] RPC: $rpcUrl" -ForegroundColor DarkCyan

try {
  Invoke-RestMethod -Method Post -Uri $rpcUrl -Headers $headers -Body $body | Out-Null
  Write-Host "[OK] Ledger ingested." -ForegroundColor Green
} catch {
  Write-Host "[FAIL] RPC ingestion failed." -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message -ForegroundColor DarkRed
  }
  exit 1
}
