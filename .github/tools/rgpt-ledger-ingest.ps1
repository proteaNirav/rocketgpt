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

$rpcUrl = ($SupabaseUrl.TrimEnd("/") + "/rest/v1/rpc/rgpt_ingest_selfimprove_ci")

$body = @{
  p_source         = "ci"
  p_subsystem      = $Subsystem
  p_severity       = $Severity
  p_title          = $Title
  p_description    = $Description
  p_confidence     = $Confidence
  p_evidence_ref   = $EvidenceRef
  p_related_commit = $RelatedCommit
  p_related_pr     = $RelatedPR
  p_origin_ref     = $OriginRef
} | ConvertTo-Json -Depth 6

$headers = @{
  "apikey"        = $ServiceKey
  "Authorization" = "Bearer $ServiceKey"
  "Content-Type"  = "application/json"
}
Write-Host "[RGPT] Ingesting CI Self-Improve event -> ledger" -ForegroundColor Cyan
Invoke-RestMethod -Method Post -Uri $rpcUrl -Headers $headers -Body $body | Out-Null
Write-Host "[OK] Ledger row written." -ForegroundColor Green
