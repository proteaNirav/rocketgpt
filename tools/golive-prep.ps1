param(
  [string]$Repo = "proteaNirav/rocketgpt",
  [string]$ProdUrl = "https://rocketgpt.vercel.app",
  [int]$GhRunLimit = 10
)

function Section($title) { Write-Host "`n=== $title ===" -ForegroundColor Cyan }

function Get-GitStatus {
  Section "Git status (local)"
  git rev-parse --abbrev-ref HEAD
  git status --porcelain
  git log -1 --oneline
}

function Get-GHRuns {
  param([int]$Limit = 10)
  Section "GitHub Actions (latest runs)"
  gh run list --repo $Repo --limit $Limit
}

function Get-GHPRs {
  Section "PRs (open)"
  gh pr list --repo $Repo --state open --limit 10
}

function Get-GHIssues {
  Section "Issues (open, top 10)"
  gh issue list --repo $Repo --limit 10
}

function Probe-Prod {
  param([string]$Url)
  Section "Prod probe"
  try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    $sw.Stop()
    Write-Host ("Status: {0}  Time: {1} ms  Length: {2}" -f $r.StatusCode, $sw.ElapsedMilliseconds, $r.Content.Length)
  } catch {
    Write-Warning $_.Exception.Message
    if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream) {
      try {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $sr.ReadToEnd()
        Write-Host ("Response snippet:`n" + $body.Substring(0, [Math]::Min(600, $body.Length)))
      } catch {}
    }
  }

  # Health endpoint (fixed)
  $health = ($Url.TrimEnd('/')) + "/api/health"
  try {
    $r2 = Invoke-WebRequest -Uri $health -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    $preview = $r2.Content.Substring(0,[Math]::Min(200,$r2.Content.Length))
    Write-Host ("Health: {0} - {1}" -f $r2.StatusCode, $preview)
  } catch { Write-Host "Health endpoint not reachable (optional)." }
}

function Get-VercelStatus {
  Section "Vercel (active deployment)"
  try {
    vercel whoami | Out-Null
    vercel inspect $Env:VERCEL_PROJECT_ID 2>$null
  } catch { Write-Host "Vercel inspect skipped (ensure Vercel CLI is logged in and VERCEL_PROJECT_ID set)." }
}

function Show-Summary {
  Section "Go-Live MUST-HAVE checklist"
  @"
[ ] Login/Auth (Supabase) — email sign-in works
[ ] Dashboard renders user profile + recent runs
[ ] Self-Improve status visible (last run, pass/fail, last changed files)
[ ] Commands panel executes /rocketgpt.status /rocketgpt.logs /rocketgpt.selfimprove.now
[ ] Docs reader renders from /docs
"@ | Write-Host
}

# Run all
Get-GitStatus
Get-GHRuns -Limit $GhRunLimit
Get-GHPRs
Get-GHIssues
Probe-Prod -Url $ProdUrl
Get-VercelStatus
Show-Summary
