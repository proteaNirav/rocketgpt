# USAGE:
#   ./gh_pending_merges.ps1                  # develop vs main
#   ./gh_pending_merges.ps1 -Base develop -Compare main

param(
  [string]$Base = "develop",
  [string]$Compare = "main"
)

$ErrorActionPreference = "Stop"

function Require-Cli($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Require-Cli git; Require-Cli gh

# Repo slug
$repo = (git remote get-url origin) -replace '.*github.com[:/]|\.git$',''
if (-not $repo) { throw "No origin remote found." }

Write-Host "Repo: $repo" -ForegroundColor Cyan

# Make sure we have fresh refs
git fetch origin --prune | Out-Null

# 1) Open PRs targeting $Base
Write-Host "`n=== Open PRs -> base '$Base' ===" -ForegroundColor Yellow
$prsJson = gh pr list --base $Base --state open --json number,title,headRefName,baseRefName,mergeable,author,labels,additions,deletions,changedFiles,url,statusCheckRollup
$prs = $prsJson | ConvertFrom-Json
if (-not $prs -or $prs.Count -eq 0) {
  Write-Host "No open PRs to '$Base'." -ForegroundColor Green
} else {
  $table = @()
  foreach ($p in $prs) {
    # Labels
    $labelNames = @()
    if ($p.labels) { $labelNames = ($p.labels | ForEach-Object { $_.name }) }
    $labelsStr = if ($labelNames -and $labelNames.Count -gt 0) { ($labelNames -join ", ") } else { "(none)" }

    # Checks summary
    $checksStr = "(no checks)"
    if ($p.statusCheckRollup) {
      $pairs = @()
      foreach ($c in $p.statusCheckRollup) {
        $nm = $c.name
        $state = $null
        if ($c.PSObject.Properties.Name -contains 'conclusion' -and $c.conclusion) { $state = $c.conclusion }
        elseif ($c.PSObject.Properties.Name -contains 'status' -and $c.status) { $state = $c.status }
        else { $state = "unknown" }
        $pairs += ($nm + ":" + $state)
      }
      if ($pairs.Count -gt 0) { $checksStr = ($pairs -join ", ") }
    }

    $table += [PSCustomObject]@{
      PR        = ("#{0}" -f $p.number)
      Title     = $p.title
      Head      = $p.headRefName
      Mergeable = $p.mergeable
      Labels    = $labelsStr
      Changes   = ("+{0}/-{1} ({2} files)" -f $p.additions, $p.deletions, $p.changedFiles)
      Checks    = $checksStr
      URL       = $p.url
    }
  }
  $table | Format-Table -AutoSize
}

# 2) Divergence summary: origin/$Base vs origin/$Compare
Write-Host "`n=== Branch Divergence: origin/$Base vs origin/$Compare ===" -ForegroundColor Yellow
$counts = git rev-list --left-right --count ("origin/$Base...origin/$Compare") 2>$null
if ($LASTEXITCODE -ne 0 -or -not $counts) {
  Write-Host "Cannot compute divergence. Ensure both branches exist on remote." -ForegroundColor Red
} else {
  $parts = $counts -split '\s+'
  $ahead = [int]$parts[0]
  $behind= [int]$parts[1]
  Write-Host ("{0} is {1} ahead / {2} behind {3}" -f $Base, $ahead, $behind, $Compare) -ForegroundColor Green
}

# 3) Commits on $Base not in $Compare
Write-Host "`n=== Commits on $Base not in $Compare ===" -ForegroundColor Yellow
git log --oneline --no-decorate ("origin/$Compare..origin/$Base") | Select-Object -First 30

# 4) Commits on $Compare not in $Base
Write-Host "`n=== Commits on $Compare not in $Base ===" -ForegroundColor Yellow
git log --oneline --no-decorate ("origin/$Base..origin/$Compare") | Select-Object -First 30

Write-Host "`n✅ Pending summary complete." -ForegroundColor Green
