param(
  [ValidateSet("dev","secure","show")]
  [string]$Mode = "show",

  [string]$Owner  = "proteaNirav",
  [string]$Repo   = "rocketgpt",
  [string]$Branch = "main",

  [int]$RequiredApprovals = 1,

  [switch]$Force,          # skip confirmation
  [switch]$VerboseOutput   # echo API bodies
)

$ErrorActionPreference = "Stop"

function Assert-GH {
  Write-Host "› Checking GitHub CLI auth..." -ForegroundColor Cyan
  $null = gh auth status 2>$null
  if ($LASTEXITCODE -ne 0) { throw "gh auth not configured. Run: gh auth login" }
}

function Get-Protection {
  gh api "repos/$Owner/$Repo/branches/$Branch/protection" --jq '.'
}

function Save-Backup($json) {
  $path = ".git/tmp_${Branch}_protection_backup.json"
  New-Item -Force -ItemType Directory ".git" | Out-Null
  $json | Out-File -FilePath $path -Encoding utf8
  Write-Host "✓ Saved backup to $path" -ForegroundColor Green
  return $path
}

function Confirm-Action($prompt) {
  if ($Force) { return $true }
  $ans = Read-Host "$prompt [y/N]"
  return ($ans -match '^(y|yes)$')
}

function Invoke-ProtectionPut($bodyJson) {
  if ($VerboseOutput) {
    Write-Host "Request Body:" -ForegroundColor DarkGray
    Write-Host $bodyJson
  }
  $out = $bodyJson | gh api -X PUT `
    -H "Accept: application/vnd.github+json" `
    "repos/$Owner/$Repo/branches/$Branch/protection" `
    --input -
  if ($LASTEXITCODE -ne 0) { throw "GitHub API PUT failed." }
  return $out
}

function Build-DevBody() {
  # Keep checks strict, drop review gate for faster merges during active dev
  $obj = [ordered]@{
    required_status_checks = @{
      strict = $true
      checks = @(
        @{ context = "Validate (lint + typecheck + test)" },
        @{ context = "Policy Gate/check-policy" }
      )
    }
    enforce_admins = $true
    required_pull_request_reviews = $null
    restrictions = $null
    required_linear_history = $true
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    lock_branch = $false
    allow_fork_syncing = $false
    required_conversation_resolution = $false
  }
  return ($obj | ConvertTo-Json -Depth 6)
}

function Build-SecureBody([int]$approvals) {
  # Checks + CODEOWNERS review gate
  $obj = [ordered]@{
    required_status_checks = @{
      strict = $true
      checks = @(
        @{ context = "Validate (lint + typecheck + test)" },
        @{ context = "Policy Gate/check-policy" }
      )
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
      require_code_owner_reviews = $true
      required_approving_review_count = $approvals
      require_last_push_approval = $false
      dismiss_stale_reviews = $false
    }
    restrictions = $null
    required_linear_history = $true
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    lock_branch = $false
    allow_fork_syncing = $false
    required_conversation_resolution = $false
  }
  return ($obj | ConvertTo-Json -Depth 6)
}

# ---- Main ----
Assert-GH

if ($Mode -eq "show") {
  Write-Host "› Current protection for $Owner/$Repo@$Branch" -ForegroundColor Cyan
  $cur = Get-Protection
  if (-not $cur) { Write-Host "(none / not set)"; exit 0 }
  Write-Host $cur
  exit 0
}

Write-Host "› Reading current protection…" -ForegroundColor Cyan
$cur = Get-Protection
$backup = Save-Backup $cur

switch ($Mode) {
  "dev" {
    if (-not (Confirm-Action "Switch $Owner/$Repo@$Branch to DEV mode (checks only, no reviews)?")) { Write-Host "Aborted."; exit 1 }
    $body = Build-DevBody
    $resp = Invoke-ProtectionPut $body
    Write-Host "✓ DEV mode applied." -ForegroundColor Green
    Write-Host $resp
  }
  "secure" {
    if (-not (Confirm-Action "Switch $Owner/$Repo@$Branch to SECURE mode ($RequiredApprovals review(s) + checks)?")) { Write-Host "Aborted."; exit 1 }
    $body = Build-SecureBody -approvals $RequiredApprovals
    $resp = Invoke-ProtectionPut $body
    Write-Host "✓ SECURE mode applied." -ForegroundColor Green
    Write-Host $resp
  }
  default {
    throw "Unknown mode: $Mode"
  }
}

Write-Host "`nTip:" -NoNewline
Write-Host " .\.github\tools\toggle-protection.ps1 show" -ForegroundColor Yellow
