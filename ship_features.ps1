<#
RUN:
  Set-ExecutionPolicy -Scope Process Bypass
  ./ship_features.ps1 -Plan skeleton,auth,llm -WaitForMerge

PARAMS:
  -Plan          one or more of: skeleton, auth, llm
  -WaitForMerge  if set, script will poll until auto-merge completes (or timeout)
  -TimeoutMin    how long to wait per feature when -WaitForMerge is set (default 15)
#>

param(
  [Parameter(Mandatory=$false)]
  [ValidateSet("skeleton","auth","llm")]
  [string[]]$Plan = @("skeleton"),

  [switch]$WaitForMerge,

  [int]$TimeoutMin = 15
)

$ErrorActionPreference = "Stop"

function Need($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Need git; Need gh

# --- Repo info ---
$repo = (git remote get-url origin) -replace '.*github.com[:/]|\.git$',''
if (-not $repo) { throw "No 'origin' remote found." }
$default = gh repo view --json defaultBranchRef -q .defaultBranchRef.name
if (-not $default) { $default = "main" }

Write-Host "Repo: $repo" -ForegroundColor Cyan
Write-Host "Default branch: $default" -ForegroundColor Cyan

# --- Ensure the workflow exists by name (grabs the exact display name or id) ---
function Get-ShipWorkflowName {
  $list = gh workflow list --json name,path,state,id | ConvertFrom-Json
  $wf = $list | Where-Object { $_.name -eq "RocketGPT Ship Issue" }
  if ($null -ne $wf) { return $wf.name }
  # fallback: try by path (if name changed)
  $wf = $list | Where-Object { $_.path -like "*ship-issue.yml" -and $_.state -eq "active" }
  if ($null -ne $wf) { return $wf.name }
  throw "RocketGPT Ship Issue workflow not found or disabled. Enable it in Actions."
}

$ShipWorkflowName = Get-ShipWorkflowName
Write-Host "Using workflow: $ShipWorkflowName" -ForegroundColor Cyan

# --- Helpers ---
function New-FeatureIssue {
  param([string]$Title,[string]$Body)
  # gh issue create prints a URL; capture it reliably:
  $url = gh issue create --title $Title --body $Body
  if (-not $url -or ($url -notmatch "/issues/")) { throw "Failed to create issue. Output: $url" }
  $num = ($url -replace '.*/issues/','').Trim()
  return @{ url=$url; number=$num }
}

function Run-ShipIssue {
  param([int]$IssueNumber)
  gh workflow run $ShipWorkflowName -f issue_number=$IssueNumber | Out-Null
  # get most recent run-id for this workflow
  Start-Sleep -Seconds 2
  $rid = gh run list --workflow $ShipWorkflowName --limit 1 --json databaseId -q '.[0].databaseId'
  return $rid
}

function Wait-RunComplete {
  param([string]$RunId,[int]$TimeoutMin=10)
  $deadline = (Get-Date).AddMinutes($TimeoutMin)
  while($true){
    $js = gh run view $RunId --json status,conclusion,name,headBranch,event -q .
    $status = $js.status
    $concl  = $js.conclusion
    if ($status -ne "in_progress" -and $status -ne "queued"){
      return @{ status=$status; conclusion=$concl }
    }
    if (Get-Date -gt $deadline) { throw "Run $RunId did not complete in $TimeoutMin min." }
    Start-Sleep -Seconds 6
  }
}

function Find-PrForIssue {
  param([int]$IssueNumber)
  # Look for PR with issue number in title
  $prs = gh pr list --state open --search "$IssueNumber in:title" --json number,title,url,headRefName,baseRefName,createdAt
  if ($prs -and $prs -ne "[]"){
    $arr = $prs | ConvertFrom-Json
    if ($arr.Count -ge 1){ return $arr[0] }
  }
  return $null
}

function Wait-PrMerged {
  param([int]$PrNumber,[int]$TimeoutMin=15)
  $deadline = (Get-Date).AddMinutes($TimeoutMin)
  while($true){
    $info = gh pr view $PrNumber --json merged,mergeStateStatus,mergeable,url,number -q .
    if ($info.merged -eq $true){ return $info }
    if (Get-Date -gt $deadline) { throw "PR #$PrNumber not merged within $TimeoutMin min." }
    Start-Sleep -Seconds 8
  }
}

# --- Feature bodies (high-level requirements only; workflows/codegen do the rest) ---
$ISSUES = @{}

$ISSUES.skeleton = @{
  Title = "App Skeleton: basic UI + health API + test"
  Body  = @"
Objective:
- Create minimal Next.js app skeleton so RocketGPT UI runs.

Scope of change:
- UI: home (/) and /hello pages; link back home; show build time note.
- API: /api/health returns { ok: true, version }.
- Tooling: vitest config + one tiny test; eslint/tsconfig minimal; README quickstart.

Tech constraints:
- Next.js + TypeScript; Vitest.
- Keep free-tier friendly; no paid deps.

Acceptance criteria:
- Pages build and render in preview.
- CI green.
- No secrets committed.
- Small, reviewable diff.
"@
}

$ISSUES.auth = @{
  Title = "Auth & Guarded Routes (M2)"
  Body  = @"
Objective:
- Email OTP-style sign-in page (UI only) and a protected dashboard.

Scope of change:
- UI: /login (form-only, no live provider); /dashboard guarded route.
- Guard: hitting /dashboard when 'not signed-in' redirects to /login (stub session ok).
- Config: basic auth utilities stub; tests.

Tech constraints:
- Next.js + TypeScript; free-tier only.

Acceptance criteria:
- /login renders; /dashboard redirects if no stub session.
- CI green; no secrets.
- Small, reviewable diff.
"@
}

$ISSUES.llm = @{
  Title = "LLM Router v0 (multi-provider stub + playground)"
  Body  = @"
Objective:
- Server action llmRouter() that accepts {model, messages[]} and routes to a stub provider (dev mode), plus minimal playground UI.

Scope of change:
- API/server action: src/server/llmRouter.ts returns deterministic stub text when keys missing.
- UI: /playground posts to llmRouter and renders the reply.
- Docs: how to later plug real providers via env vars.

Tech constraints:
- Free-first; no paid providers required to run.

Acceptance criteria:
- Playground shows a response with no keys present (dev stub).
- CI green; no secrets.
- Small, reviewable diff.
"@
}

# --- Execute plan ---
foreach($p in $Plan){
  Write-Host "`n=== FEATURE: $p ===" -ForegroundColor Magenta
  $title = $ISSUES.$p.Title
  $body  = $ISSUES.$p.Body

  # 1) Create Issue
  $issue = New-FeatureIssue -Title $title -Body $body
  $num   = [int]$issue.number
  Write-Host ("Issue #{0} -> {1}" -f $num, $issue.url) -ForegroundColor Green

  # 2) Run Ship Issue
  $rid = Run-ShipIssue -IssueNumber $num
  Write-Host ("Ship-Issue run id: {0}" -f $rid) -ForegroundColor Cyan

  # 3) Wait Ship Issue completes
  $res = Wait-RunComplete -RunId $rid -TimeoutMin 10
  Write-Host ("Ship-Issue: {0}/{1}" -f $res.status, $res.conclusion) -ForegroundColor Yellow

  # 4) Find PR
  $pr = Find-PrForIssue -IssueNumber $num
  if ($null -eq $pr){
    # Nudge: re-label and try again once
    Write-Host "No PR found yet. Nudging codegen (relabel)..." -ForegroundColor Yellow
    gh issue edit $num --remove-label codegen:ready | Out-Null
    gh issue edit $num --add-label codegen:ready | Out-Null
    Start-Sleep -Seconds 5
    $pr = Find-PrForIssue -IssueNumber $num
  }

  if ($null -eq $pr){
    Write-Host "⚠ Still no PR located for issue #$num. Check Actions → AI Codegen logs." -ForegroundColor Red
    continue
  }

  Write-Host ("PR #{0} -> {1} | {2}->{3}" -f $pr.number, $pr.url, $pr.headRefName, $pr.baseRefName) -ForegroundColor Green

  # 5) Optionally wait for auto-merge (the Ship workflow already enables it)
  if ($WaitForMerge){
    try {
      $merged = Wait-PrMerged -PrNumber $pr.number -TimeoutMin $TimeoutMin
      Write-Host ("✅ Merged: PR #{0} -> {1}" -f $pr.number, $pr.url) -ForegroundColor Green
    } catch {
      Write-Host ("⏳ Not merged within {0} min: {1}" -f $TimeoutMin, $pr.url) -ForegroundColor Yellow
    }
  }
}

Write-Host "`nDone. Open Pull Requests:" -ForegroundColor Cyan
gh pr list --state open --json number,title,url,headRefName,baseRefName -q '.[]' | Out-Null
gh pr list --state open --json number,title,url,headRefName,baseRefName -q '.[]'
