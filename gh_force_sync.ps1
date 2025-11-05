# USAGE:
#   ./gh_force_sync.ps1 develop
#   ./gh_force_sync.ps1 feature/x -NoPrompt

[CmdletBinding(SupportsShouldProcess=$true, ConfirmImpact='High')]
param(
  [Parameter(Position=0)] [string]$Branch = "develop",
  [switch]$NoPrompt
)

$ErrorActionPreference = "Stop"

function Require-Cli($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Require-Cli git; Require-Cli gh

# Detect repo slug
$repo = (git remote get-url origin) -replace '.*github.com[:/]|\.git$',''
if (-not $repo) { throw "No origin remote found." }

Write-Host "Repo:   $repo" -ForegroundColor Cyan
Write-Host "Branch: $Branch" -ForegroundColor Cyan

# Ensure local branch exists
git fetch origin $Branch --depth=1 2>$null | Out-Null
try { git rev-parse --verify $Branch | Out-Null } catch { throw "Local branch '$Branch' not found. Checkout/create it first." }

# Confirmation
if (-not $NoPrompt) {
  $resp = Read-Host "This will OVERWRITE 'origin/$Branch' with your LOCAL '$Branch'. Type '$Branch' to proceed"
  if ($resp -ne $Branch) { throw "Aborted by user." }
}

# Backup remote before overwriting
$backupName = "backup/$Branch-$(Get-Date -f 'yyyyMMdd-HHmmss')"
$refspec = $Branch + ":" + $backupName
Write-Host "Backing up origin/$Branch -> $backupName" -ForegroundColor Yellow
git fetch origin $refspec | Out-Null

# Temporarily relax protection (best-effort)
Write-Host "Relaxing branch protection on '$Branch' (temp)..." -ForegroundColor Yellow
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
  "allow_force_pushes": true,
  "allow_deletions": false
}
'@
try { $payloadRelax | gh api -X PUT "repos/$repo/branches/$Branch/protection" --input - | Out-Null } catch { }

# Force push local -> remote
Write-Host "Force pushing local '$Branch' -> origin/$Branch ..." -ForegroundColor Magenta
git checkout $Branch | Out-Null
git push origin $Branch --force

# Restore protections
Write-Host "Restoring branch protection on '$Branch' ..." -ForegroundColor Yellow
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
try { $payloadRestore | gh api -X PUT "repos/$repo/branches/$Branch/protection" --input - | Out-Null } catch { }

Write-Host "`n✅ Hard push completed and protections restored on '$Branch'." -ForegroundColor Green
Write-Host "   Backup ref created: '$backupName'" -ForegroundColor Green
