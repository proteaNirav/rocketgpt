param(
  [Parameter(Mandatory)]
  [string]$DiffFile,

  [Parameter(Mandatory)]
  [string]$OutFile
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------
# Validate inputs
# ------------------------------------------------------------
if (-not (Test-Path $DiffFile)) {
  throw "Missing diff file: $DiffFile"
}

$promptPath = ".github/tools/claude/prompts/REVIEW_READONLY.md"
if (-not (Test-Path $promptPath)) {
  throw "Missing prompt: $promptPath"
}

# ------------------------------------------------------------
# Load Claude model policy (single source of truth)
# ------------------------------------------------------------
$modelPolicyPath = ".github/tools/claude/CLAUDE_MODEL_POLICY.json"
if (-not (Test-Path $modelPolicyPath)) {
  throw "Missing model policy: $modelPolicyPath"
}

$policy = Get-Content $modelPolicyPath -Raw | ConvertFrom-Json

$model = $policy.reviewer.fallback_model
if (-not $model) {
  throw "Model policy invalid: reviewer.fallback_model is empty"
}

$allowed = @($policy.reviewer.allowed_models)
if (
  ($policy.reviewer.enforce -eq $true) -and
  ($allowed.Count -gt 0) -and
  (-not ($allowed -contains $model))
) {
  throw "Model policy violation: '$model' is not in allowed_models"
}

# ------------------------------------------------------------
# Load diff + prompt
# ------------------------------------------------------------
$diff   = Get-Content $DiffFile -Raw
$basePrompt = Get-Content $promptPath -Raw

# ------------------------------------------------------------
# Prepend contract enforcement header to prompt
# ------------------------------------------------------------
$contractHeader = @"
# CLAUDE EXECUTION CONTRACT v1.0 - BINDING

You are operating under the Claude Execution Contract v1.0.
Contract hash (SHA256): $contractHash

EXECUTION MODE: DIFF_ONLY (READ-ONLY)

FORBIDDEN OPERATIONS (HARD GATE):
- NO write operations to any files
- NO git commits, branching, checkout, or push operations
- NO dependency installation (npm install, pnpm install, pip install, etc.)
- NO network access

You MUST operate in DIFF_ONLY mode. You MAY only read files and generate analysis. Any violation halts execution.
"@

# ------------------------------------------------------------
# Build Claude Messages API payload (correct format)
# ------------------------------------------------------------
$payload = @{
  model       = $model
  system      = "$contractHeader`n`n---`n`n$basePrompt"
  max_tokens  = 2048
  messages    = @(
    @{
      role    = "user"
      content = "DIFF:`n$diff"
    }
  )
} | ConvertTo-Json -Depth 6

# ------------------------------------------------------------
# Headers (Anthropic compliant)
# ------------------------------------------------------------
$headers = @{
  "x-api-key"         = $env:CLAUDE_API_KEY
  "content-type"      = "application/json"
  "anthropic-version" = "2023-06-01"
}

# ------------------------------------------------------------
# Invoke Claude
# ------------------------------------------------------------
$response = Invoke-RestMethod `
  -Uri "https://api.anthropic.com/v1/messages" `
  -Method POST `
  -Headers $headers `
  -Body $payload

# ------------------------------------------------------------
# Prepend contract metadata evidence to output
# ------------------------------------------------------------
$evidence = @"
contract_path=docs/contracts/CLAUDE_EXECUTION_CONTRACT_v1.md
contract_version=v1.0
execution_mode=DIFF_ONLY
contract_hash_sha256=$contractHash

"@

$evidence + $response.content[0].text | Out-File $OutFile -Encoding utf8

Write-Host "[OK] Claude review written to $OutFile (model: $model)" -ForegroundColor Green

