param(
  [ValidateSet("dev","secure","show")]
  [string]$Mode = "show",
  [string]$Owner = "proteaNirav",
  [string]$Repo  = "rocketgpt",
  [string]$Branch = "main",
  [int]$RequiredApprovals = 1
)

$ErrorActionPreference = "Stop"

function Ensure-GhAuth {
  $null = gh auth status 2>$null
  if ($LASTEXITCODE -ne 0) { throw "GitHub CLI not authenticated. Run: gh auth login" }
}

function Get-Protection {
  gh api "repos/$Owner/$Repo/branches/$Branch/protection" --jq '.'
}

function Put-Protection([string]$JsonBody) {
  $JsonBody | gh api -X PUT -H "Accept: application/vnd.github+json" `
    "repos/$Owner/$Repo/branches/$Branch/protection" --input -
  if ($LASTEXITCODE -ne 0) { throw "Failed to update branch protection." }
}

function Build-Body([bool]$EnableReviews, [int]$Approvals) {
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

  if ($EnableReviews) {
    $obj.required_pull_request_reviews = @{
      require_code_owner_reviews = $true
      required_approving_review_count = $Approvals
      require_last_push_approval = $false
      dismiss_stale_reviews = $false
    }
  }

  return ($obj | ConvertTo-Json -Depth 6)
}

Ensure-GhAuth

switch ($Mode.ToLower()) {
  "show" {
    Write-Host ">> Current protection for $Owner/$Repo@$Branch"
    $cur = Get-Protection
    if (-not $cur) { Write-Host "(none)"; break }
    Write-Host $cur
    break
  }
  "dev" {
    Write-Host ">> Applying DEV mode (required checks ON, reviews OFF)..."
    $body = Build-Body -EnableReviews:$false -Approvals 0
    Put-Protection $body
    Write-Host ">> DEV mode applied."
    break
  }
  "secure" {
    Write-Host ">> Applying SECURE mode (required checks ON, codeowner reviews = $RequiredApprovals)..."
    $body = Build-Body -EnableReviews:$true -Approvals $RequiredApprovals
    Put-Protection $body
    Write-Host ">> SECURE mode applied."
    break
  }
  default {
    throw "Unknown mode: $Mode"
  }
}
