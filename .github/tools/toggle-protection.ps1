Param(
    [ValidateSet("show","dev","safe","lock")]
    [string]$mode = "show"
)

$repo   = "proteaNirav/rocketgpt"
$branch = "main"

function Patch-Protect([string]$json) {
    $json | gh api --method PUT "repos/$repo/branches/$branch/protection" `
        -H "Accept: application/vnd.github+json" `
        --input -
}

switch ($mode) {
    "show" {
        Write-Host ">> Current protection for $repo@$branch"
        gh api "repos/$repo/branches/$branch/protection"
        return
    }

    "dev" {
        Write-Host ">> Applying DEV mode (required checks ON, reviews OFF)..."
        $body = @"
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "Validate (lint + typecheck + test)"},
      {"context": "Policy Gate/check-policy"}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
"@
        Patch-Protect $body
        return
    }

    "safe" {
        Write-Host ">> Applying SAFE mode (2 reviews, CODEOWNERS, checks ON)..."
        $body = @"
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "Validate (lint + typecheck + test)"},
      {"context": "Policy Gate/check-policy"}
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
"@
        Patch-Protect $body
        return
    }

    "lock" {
        Write-Host ">> Locking branch (may be ignored by some repos)..."
        $body = @"
{ "lock_branch": { "enabled": true } }
"@
        Patch-Protect $body
        return
    }
}
