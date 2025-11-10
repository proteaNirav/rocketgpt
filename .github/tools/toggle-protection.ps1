param(
  [Parameter(Position=0)]
  [ValidateSet("show","dev","strict")]
  [string]$mode = "show"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-GitHubAPI($method, $url, $body=$null) {
  $headers = @{
    Authorization = "token $env:GITHUB_TOKEN"
    Accept        = "application/vnd.github+json"
  }
  if ($body -ne $null) {
    $json = $body | ConvertTo-Json -Depth 6 -Compress
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers -Body $json
  } else {
    return Invoke-RestMethod -Method $method -Uri $url -Headers $headers
  }
}

$owner  = "proteaNirav"
$repo   = "rocketgpt"
$branch = "main"
$apiUrl = "https://api.github.com/repos/$owner/$repo/branches/$branch/protection"

switch ($mode) {
  "show" {
    Write-Host ">> Current protection for $owner/$repo@$branch"
    Invoke-GitHubAPI GET $apiUrl | ConvertTo-Json -Depth 8
  }
  "dev" {
    Write-Host ">> Applying DEV mode (checks ON, reviews OFF, admins not enforced)..."
    $body = @{
      required_status_checks = @{
        strict   = $true
        contexts = @("Validate (lint + typecheck + test)", "Policy Gate/check-policy")
      }
      enforce_admins = $false
      required_pull_request_reviews = $null
      restrictions = $null
      # NOTE: omit optional booleans like allow_force_pushes, allow_deletions, etc.
      # The update endpoint accepts a minimal payload; extra keys can 422.
    }
    Invoke-GitHubAPI PUT $apiUrl $body | Out-Null
    Write-Host ">> DEV mode applied."
  }
  "strict" {
    Write-Host ">> Applying STRICT production mode (checks ON, 1 review, admins enforced)..."
    $body = @{
      required_status_checks = @{
        strict   = $true
        contexts = @("Validate (lint + typecheck + test)", "Policy Gate/check-policy")
      }
      enforce_admins = $true
      required_pull_request_reviews = @{
        required_approving_review_count = 1
      }
      restrictions = $null
    }
    Invoke-GitHubAPI PUT $apiUrl $body | Out-Null
    Write-Host ">> STRICT mode applied."
  }
}