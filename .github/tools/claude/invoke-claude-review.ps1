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

$ param($m)
  $prefix = $m.Groups[1].Value
  $body   = $m.Groups[2].Value
  # Add at the top of headers block
  return $prefix + "  `"anthropic-version`" = `"2023-06-01`"`r`n" + $body + "}"


$response = Invoke-RestMethod `
  -Uri "https://api.anthropic.com/v1/messages" `
  -Method POST `
  -Headers $headers `
  -Body $payload

$response.content[0].text | Out-File $OutFile -Encoding utf8

Write-Host "[OK] Claude review written to $OutFile" -ForegroundColor Green


