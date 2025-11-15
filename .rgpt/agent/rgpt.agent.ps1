# Requires: PowerShell 7+, Git, GitHub CLI (gh) logged in
# Purpose: Read tasks from inbox (JSONL), execute with allowlist & timeouts,
#          create git patch/PR, write results to outbox.

param(
  [string]$ConfigPath = ".\rgpt.agent.config.json",
  [string]$InboxPath  = ".\rgpt.task.inbox.jsonl",
  [string]$OutboxPath = ".\rgpt.task.outbox.jsonl"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-Config {
  param([string]$Path)
  if (-not (Test-Path $Path)) { throw "Config not found: $Path" }
  return Get-Content $Path -Raw | ConvertFrom-Json
}

function Write-Result {
  param([hashtable]$obj)
  ($obj | ConvertTo-Json -Depth 6 -Compress) | Add-Content -Path $OutboxPath
}

function New-Runspace {
  param($cfg)
  Push-Location $cfg.workingDir
  git config user.name  $cfg.git.botName  | Out-Null
  git config user.email $cfg.git.botEmail | Out-Null
}

function New-SandboxBranch {
  param($base="main")
  $ts = Get-Date -Format "yyyyMMdd-HHmmss"
  $branch = "rgpt/sbx/$ts"
  git fetch origin $base | Out-Null
  git checkout -B $branch origin/$base | Out-Null
  return $branch
}

function Is-AllowedCommand {
  param($cmd, $cfg)
  $matchCount = 0
  foreach ($allowed in $cfg.policy.allowedCommands) {
    if ($cmd.StartsWith($allowed)) { $matchCount++ }
  }
  return $matchCount
}

function Guard-Paths {
  param($cfg)
  $staged = git diff --name-only --staged
  foreach ($f in $staged) {
    $ok = $false
    foreach ($p in $cfg.policy.allowedPaths) {
      if ($f -like "$p*") { $ok = $true; break }
    }
    if (-not $ok) { throw "Blocked staged path: $f (outside allowlist)" }
  }
}

function Run-Command {
  param($cmd, $cfg, $timeoutSec)
  if ((Is-AllowedCommand $cmd $cfg) -eq 0) {
    throw "Command not allowed by policy: $cmd"
  }

  $start = Get-Date
  $job = Start-Job -ScriptBlock {
    param($c)
    & $env:COMSPEC /c $c 2>&1
  } -ArgumentList $cmd

  if (-not (Wait-Job $job -Timeout $timeoutSec)) {
    Stop-Job $job -Force | Out-Null
    throw "Timeout after ${timeoutSec}s: $cmd"
  }
  $output = Receive-Job $job
  $rc = 0
  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { $rc = $LASTEXITCODE }

  return @{
    command   = $cmd
    started   = $start.ToString("o")
    ended     = (Get-Date).ToString("o")
    durationS = [int]((New-TimeSpan -Start $start -End (Get-Date)).TotalSeconds)
    rc        = $rc
    output    = ($output -join "`n")
  }
}

function Open-PR {
  param($cfg, $branch, $title, $body, $labels)
  git push -u origin $branch | Out-Null
  $prUrl = (& gh pr create --base $cfg.pr.targetBase --head $branch --title $title --body $body 2>&1)
  if ($labels -and $labels.Count -gt 0) {
    & gh pr edit --add-label ($labels -join ',') | Out-Null
  }
  return $prUrl
}

# Main loop (single-pass: process all new lines then exit)
$cfg = Read-Config $ConfigPath
New-Runspace $cfg

try {
  if (-not (Test-Path $InboxPath)) { New-Item -ItemType File -Path $InboxPath | Out-Null }
  if (-not (Test-Path $OutboxPath)) { New-Item -ItemType File -Path $OutboxPath | Out-Null }

  $lines = Get-Content $InboxPath
  if (-not $lines) { return }

  # Clear inbox for next run (append-only protocol expected by caller)
  Clear-Content $InboxPath

  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $task = $null
    try { $task = $line | ConvertFrom-Json } catch { continue }

    $id = $task.id
    $mode = $task.mode  # "dry-run" | "apply-dev"
    $cmds = @($task.commands)

    # Robust title/body fallback (no null-coalescing)
    $taskTitle = if ($task -and ($task.PSObject.Properties['title'])) { $task.title } else { 'Automated change' }
    $title = "[RGPT] $taskTitle"
    $taskBody  = if ($task -and ($task.PSObject.Properties['body']))  { $task.body  } else { "Automated change triggered from chat.`n`nLogs attached below." }
    $body  = $taskBody

    $branch = $null
    $logs = @()

    try {
      if ($mode -eq "dry-run") {
        foreach ($c in $cmds) {
          $res = Run-Command -cmd $c -cfg $cfg -timeoutSec $cfg.policy.maxRuntimeSeconds
          $logs += $res
        }
        Write-Result @{ id=$id; status="DRYRUN_OK"; logs=$logs; branch=$null; pr=$null }
        continue
      }

      if ($mode -eq "apply-dev") {
        $branch = New-SandboxBranch -base $cfg.git.defaultBase
        foreach ($c in $cmds) {
          $res = Run-Command -cmd $c -cfg $cfg -timeoutSec $cfg.policy.maxRuntimeSeconds
          $logs += $res
          if ($res.rc -ne 0) { throw "Command failed: $($res.command)" }
        }

        git add -A
        Guard-Paths $cfg

        if ((git diff --cached --name-only) -eq $null) {
          Write-Result @{ id=$id; status="NO_CHANGES"; logs=$logs; branch=$branch; pr=$null }
          git checkout $cfg.git.defaultBase | Out-Null
          git branch -D $branch | Out-Null
          continue
        }

        $commitMsg = if ($task -and ($task.PSObject.Properties['commitMessage'])) { $task.commitMessage } else { 'Automated commit' }
        git commit -m "$($cfg.pr.titlePrefix)$commitMsg" | Out-Null
        $prUrl = Open-PR -cfg $cfg -branch $branch -title $title -body $body -labels $cfg.pr.autoLabels
        Write-Result @{ id=$id; status="PR_OPENED"; logs=$logs; branch=$branch; pr=$prUrl }
        continue
      }

      throw "Unknown mode: $mode"
    }
    catch {
      Write-Result @{ id=$id; status="ERROR"; error="$_"; logs=$logs; branch=$branch; pr=$null }
      if ($branch) { git checkout $cfg.git.defaultBase | Out-Null; git branch -D $branch | Out-Null }
    }
  }
}
finally {
  Pop-Location
}