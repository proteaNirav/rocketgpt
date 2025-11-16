# USAGE:
#   ./gh_safe_merge.ps1 -Pr 110 -Branch develop
#   ./gh_safe_merge.ps1 110 develop -NoPrompt
# REQS: gh CLI logged in with admin on the repo; run from a git clone with origin set.

[CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='High')]
param(
  [Parameter(Mandatory=$true, Position=0)]
  [int]$Pr,

  [Parameter(Mandatory=$true, Position=1)]
  [string]$Branch,

  [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"

function Require-Cli($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Require-Cli git; Require-Cli gh

# Resolve repo slug from origin
$repo = (git remote get-url origin) -replace '.*github.com[:/]|\.git$',''
if (-not $repo) { throw "No origin remote found (is this a GitHub clone?)." }

Write-Host "Repo:   $repo"   -ForegroundColor Cyan
Write-Host "PR #:   $Pr"     -ForegroundColor Cyan
Write-Host "Branch: $Branch" -ForegroundColor Cyan

# Simple confirmation
if (-not $NoPrompt) {
  $resp = Read-Host "This will temporarily relax protection on '$Branch' and squash-merge PR #$Pr. Type '$Pr' to proceed"
  if ($resp -ne "$Pr") { throw "Aborted by user." }
}

# Verify PR targets the expected base branch
$prBase = gh pr view $Pr --json baseRefName -q .baseRefName
if (-not $prBase) { throw "Cannot read PR #$Pr. Do you have access?" }
if ($prBase -ne $Branch) {
  throw "PR #$Pr targets '$prBase', not '$Branch'. Re-run with the correct Branch or update the PR base."
}

# 1) RELAX protection (best-effort)
Write-Host "Relaxing branch protection on '$Branch' (temporary)..." -ForegroundColor Yellow
$payloadRelax = @'
{
  "required_status_checks": { "strict": true, "contexts": [] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@
try {
  $payloadRelax | gh api -X PUT "repos/$repo/branches/$Branch/protection" --input - | Out-Null
} catch {
  Write-Warning "Could not relax protection via API. If merge fails, relax manually and re-run."
}

# 2) MERGE (squash + delete head)
Write-Host "Merging PR #$Pr (squash)…" -ForegroundColor Magenta
try {
  gh pr merge $Pr --squash --delete-branch --admin
} catch {
  Write-Warning "Merge failed: $($_.Exception.Message)"
  Write-Warning "Leaving protections relaxed to let you inspect. Re-run after fixing, or restore protections with step 3 below."
  throw
}

# 3) RESTORE protection (Validate check + 1 approval)
Write-Host "Restoring branch protection on '$Branch'…" -ForegroundColor Yellow
$payloadRestore = @'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Validate (lint + typecheck + test)"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@
try {
  $payloadRestore | gh api -X PUT "repos/$repo/branches/$Branch/protection" --input - | Out-Null
} catch {
  Write-Warning "Failed to restore protections: $($_.Exception.Message)"
  Write-Warning "Please restore protections manually from GitHub Settings → Branches."
  throw
}

Write-Host "`n✅ Done. PR #$Pr merged into '$Branch' and protections restored." -ForegroundColor Green
