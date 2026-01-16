# install_self_improve.ps1
# RocketGPT v4: Self-Improve + Watchdog + Safety Locks (branch: v4-core-ai)

[CmdletBinding()]
param(
  [int]$Issue = 110,
  [string]$Branch = "v4-core-ai"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$PSNativeCommandUseErrorActionPreference = $false  # (ignored on Windows PowerShell 5.1, harmless on PS7+)


Write-Host "== AUTH ==" -ForegroundColor Cyan
gh auth status | Out-Host

Write-Host "`n== REPO ==" -ForegroundColor Cyan
$Repo = gh repo view --json nameWithOwner -q .nameWithOwner
if (-not $Repo) { throw "Not in a GitHub repo folder. cd into the repo first." }
Write-Host "Using repo: $Repo"

Write-Host "`n== CHECKOUT BRANCH == $Branch" -ForegroundColor Cyan
git fetch origin --prune | Out-Null

# What branch are we on?
$current = (git symbolic-ref --short -q HEAD).Trim()

if ($current -ne $Branch) {
  if (git show-ref --verify --quiet "refs/remotes/origin/$Branch") {
    # Remote branch exists – track it
    git switch -c $Branch --track "origin/$Branch" 1>$null 2>$null
  } else {
    # Create from main
    git switch -c $Branch --track "origin/main" 1>$null 2>$null
  }
} else {
  Write-Host "Already on $Branch" -ForegroundColor DarkGray
}


# --- File paths ---
$SelfImprovePath = ".github/workflows/self_improve.yml"
$WatchdogPath    = ".github/workflows/watchdog.yml"
$PolicyPath      = ".github/auto-ops.json"
$PolicyGatePath  = ".github/workflows/policy_gate.yml"

# --- File contents (single-quoted here-strings to preserve ${{ }} ) ---
$SelfImproveYml = @'
name: Self Improve

on:
  workflow_dispatch:
    inputs:
      reason:
        description: Why this run
        required: false
  schedule:
    - cron: "*/15 * * * *"

jobs:
  plan-and-nudge:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Find stalled issues (label=codegen:ready, no open PR)
        id: stalled
        uses: actions/github-script@v7
        with:
          script: |
            const {owner, repo} = context.repo;
            const resIssues = await github.rest.search.issuesAndPullRequests({
              q: `repo:${owner}/${repo} is:issue is:open label:codegen:ready`,
              per_page: 10
            });
            const candidates = [];
            for (const it of resIssues.data.items) {
              const q = `repo:${owner}/${repo} is:pr is:open ${it.number}`;
              const resPr = await github.rest.search.issuesAndPullRequests({ q, per_page: 5 });
              const hasOpenPr = resPr.data.items?.some(x => x.state === 'open');
              if (!hasOpenPr) candidates.push(it.number);
            }
            core.setOutput('issue_list', JSON.stringify(candidates));

      - name: Nudge AI Codegen for stalled issues
        if: ${{ steps.stalled.outputs.issue_list != '' && steps.stalled.outputs.issue_list != '[]' }}
        uses: actions/github-script@v7
        with:
          script: |
            const issues = JSON.parse(`${{ steps.stalled.outputs.issue_list }}`);
            for (const iss of issues) {
              core.info(`Dispatching AI Codegen for #${iss}`);
              await github.rest.actions.createWorkflowDispatch({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: "codegen.yml",
                ref: "main",
                inputs: { issue_number: String(iss) }
              }).catch(e => core.warning(e.message));
              // Nudge label to re-trigger label-based automations
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: Number(iss),
                labels: ["codegen:ready"]
              }).catch(e => core.warning(e.message));
            }
'@

$WatchdogYml = @'
name: Watchdog

on:
  workflow_run:
    workflows: ["AI Codegen", "RocketGPT Ship Issue"]
    types: [completed]

jobs:
  watch:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - name: Observe
        uses: actions/github-script@v7
        with:
          script: |
            core.info('Observed run: ' + context.payload.workflow_run.name);
            core.info('Conclusion: ' + context.payload.workflow_run.conclusion);

      - name: On failure — minimal redispatch
        if: ${{ contains(fromJson('["failure","cancelled","timed_out"]'), github.event.workflow_run.conclusion) }}
        uses: actions/github-script@v7
        with:
          script: |
            const defaultIssue = process.env.DEFAULT_ISSUE || "110";
            try {
              await github.rest.actions.createWorkflowDispatch({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: "codegen.yml",
                ref: "main",
                inputs: { issue_number: String(defaultIssue) }
              });
              core.info('Redispatched AI Codegen for #' + defaultIssue);
            } catch (e) {
              core.warning('Redispatch failed: ' + e.message);
            }
'@

# Using JSON policy so we can parse without extra deps
$PolicyJson = @'
{
  "allowed_labels": ["safe:auto-pr", "safe:auto-merge", "safe:workflow-edit", "safe:override"],
  "branch_allowlist": ["^ai/.*", "^v4-core-ai$"],
  "deny_paths": [
    "^supabase/migrations/.*",
    "^infra/terraform/.*"
  ],
  "allow_workflows": [
    "^self_improve.yml$",
    "^watchdog.yml$",
    "^policy_gate.yml$",
    "^v4_ship_placeholder.yml$"
  ]
}
'@

$PolicyGateYml = @'
name: Policy Gate

on:
  pull_request:
    types: [opened, synchronize, reopened, labeled]

jobs:
  check-policy:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Evaluate policy
        id: gate
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const policy = JSON.parse(fs.readFileSync('.github/auto-ops.json','utf8'));
            const {owner, repo} = context.repo;
            const pr = context.payload.pull_request;
            const headRef = pr.head.ref;
            const labels = pr.labels.map(l => l.name);
            const denyPaths = policy.deny_paths || [];
            const allowWorkflows = policy.allow_workflows || [];
            const branchAllow = (policy.branch_allowlist || []).map(p => new RegExp(p));

            // Branch allow
            const branchOk = branchAllow.some(rx => rx.test(headRef));
            if (!branchOk) core.setFailed(`Branch '${headRef}' not in allowlist.`);

            // Files changed
            const files = await github.paginate(github.rest.pulls.listFiles, {
              owner, repo, pull_number: pr.number, per_page: 100
            });

            const denyHit = files.some(f => denyPaths.some(p => new RegExp(p).test(f.filename)));
            if (denyHit && !labels.includes('safe:override')) {
              core.setFailed(`PR touches denied paths without 'safe:override' label.`);
            }

            // Workflow file allowlist (if workflows changed)
            const wfChanges = files.filter(f => f.filename.startsWith('.github/workflows/'));
            const badWf = wfChanges.some(f => !allowWorkflows.some(p => new RegExp(p).test(f.filename.split('/').pop())));
            if (wfChanges.length && badWf && !labels.includes('safe:workflow-edit')) {
              core.setFailed('Workflow edits must be allowlisted or labeled safe:workflow-edit.');
            }

      - name: Comment on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body: "⛔ Policy Gate blocked this PR. See failed job logs for details."
            });
'@

# --- Write files ---
$files = @{}
$files[$SelfImprovePath] = $SelfImproveYml
$files[$WatchdogPath]    = $WatchdogYml
$files[$PolicyPath]      = $PolicyJson
$files[$PolicyGatePath]  = $PolicyGateYml

foreach ($kv in $files.GetEnumerator()) {
  $path = $kv.Key
  $content = $kv.Value
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $path -Value $content -NoNewline -Encoding UTF8
  Write-Host "Wrote $path"
}

# --- Commit & push ---
git add -A
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" `
  commit -m "v4: add self_improve + watchdog + policy gate (safety locks)" 2>$null | Out-Null

git push -u origin $Branch

# --- Make sure PR #125 will close #$Issue on merge ---
try {
  $body = gh pr view 125 --json body -q .
  if ($body -notmatch "Closes #$Issue") {
    gh pr edit 125 --body "$body`r`n`r`nCloses #$Issue" | Out-Null
  }
} catch {}

# --- Enable auto-merge (squash) ---
try { gh pr merge 125 --auto --squash | Out-Null } catch {}

Write-Host "`n== Smoke run on branch (note: default-branch runs won't see new workflows yet) ==" -ForegroundColor Cyan
# Run workflows on THIS branch (not default) so they exist
gh workflow run self_improve.yml --ref $Branch -f reason="smoke run from $Branch"
Start-Sleep -Seconds 3
gh run list --workflow "Self Improve" --limit 1 | Out-Host

Write-Host "`nAll set. Self-Improve + Watchdog + Policy Gate are on '$Branch'.`n" -ForegroundColor Green

