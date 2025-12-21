param(
  [Parameter(Mandatory)]
  [string]$DiffFile,

  [Parameter(Mandatory)]
  [string]$OutFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $DiffFile)) {
  throw "Missing diff file: $DiffFile"
}

$promptPath = ".github/tools/claude/prompts/REVIEW_READONLY.md"
if (-not (Test-Path $promptPath)) {
  throw "Missing prompt: $promptPath"
}

$diff = Get-Content $DiffFile -Raw
$prompt = Get-Content $promptPath -Raw

$payload = @{
  model = "claude-3-opus-20240229"
  max_tokens = 1500
  messages = @(
    @{ role = "system"; content = $prompt }
    @{ role = "user"; content = "DIFF:`n$diff" }
  )
} | ConvertTo-Json -Depth 6

$headers = @{
  "x-api-key" = $env:CLAUDE_API_KEY
  "content-type" = "application/json"
}

$response = Invoke-RestMethod `
  -Uri "https://api.anthropic.com/v1/messages" `
  -Method POST `
  -Headers $headers `
  -Body $payload

$response.content[0].text | Out-File $OutFile -Encoding utf8

Write-Host "[OK] Claude review written to $OutFile" -ForegroundColor Green

