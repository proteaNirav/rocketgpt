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
  model  = "claude-3-5-sonnet-20241022"
  system = "You are a strict, senior software engineer performing a read-only code review. Do not suggest unsafe changes."
  max_tokens = 2048
  messages = @(
    @{ role = "user"; content = "DIFF:`n$diff" }
  )
} | ConvertTo-Json -Depth 6
$headers = @{
  "x-api-key"         = $env:CLAUDE_API_KEY
  "content-type"      = "application/json"
  "anthropic-version" = "2023-06-01"
}

$response = Invoke-RestMethod `
  -Uri "https://api.anthropic.com/v1/messages" `
  -Method POST `
  -Headers $headers `
  -Body $payload

$response.content[0].text | Out-File $OutFile -Encoding utf8

Write-Host "[OK] Claude review written to $OutFile" -ForegroundColor Green





