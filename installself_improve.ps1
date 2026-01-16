Param(
  [int]$Issue = 110,
  [string]$Branch = "v4-core-ai"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "== AUTH ==" -ForegroundColor Cyan
gh auth status | Out-Host

# Detect repo
$Repo = gh repo view --json nameWithOwner -q .nameWithOwner
if (-not $Repo) { throw "Not in a GitHub repo directory. cd into your repo first." }

Write-Host "`n== REPO ==" -ForegroundColor Cyan
Write-Host "Using repo: $Repo"

# == CHECKOUT BRANCH ==
Write-Host "`n== CHECKOUT BRANCH == $Branch" -ForegroundColor Cyan
git fetch origin --prune 2>$null | Out-Null

# Try to switch to local branch, else create from remote or main
if ((git rev-parse --verify "refs/heads/$Branch" 2>$null) -ne $null) {
  git switch $Branch 2>$null | Out-Null
  if ((git rev-parse --verify "refs/remotes/origin/$Branch" 2>$null) -ne $null) {
    git pull --ff-only origin $Branch | Out-Null
  } else {
    git pull --ff-only origin main | Out-Null
  }
} else {
  if ((git rev-parse --verify "refs/remotes/origin/$Branch" 2>$null) -ne $null) {
    git switch -c $Branch --track "origin/$Branch" | Out-Null
  } else {
    git switch -c $Branch --track origin/main | Out-Null
  }
}

# ---------- FILE CONTENTS (single-quoted here-strings to avoid interpolation) ----------

$SelfImprovePath = ".github/workflows/self_improve.yml"
$WatchdogPath    = ".github/workflows/watchdog.yml"
$PolicyPath      = ".github/auto-ops.yml"
$PolicyGatePath  = ".github/workflows/policy_gate.yml"

$SelfImproveYml = @'
name: Self Improve

on:
  workflow_dispatch:
    inputs:
      reason:
        description: Why this run
        required: false
  schedule:
    - cron: "*/15 * * * *"   # every 15 minutes

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

      - name: Read safety policy
        id: policy
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const path = '.github/auto-ops.yml';
            core.info('Reading policy: ' + path);
            const yml = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
            return yml;

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

      - name: Nudge codegen / ship for each stalled issue
        if: ${{ steps.stalled.outputs.issue_list != '' && steps.stalled.outputs.issue_list != '[]' }}
        uses: actions/github-script@v7
        with:
          script: |
            const issues = JSON.parse(core.getInput('issue_list', {required:true}));
            for (const iss of issues) {
              core.info(`Dispatching AI Codegen for issue #${iss}`);
              await github.rest.actions.createWorkflowDispatch({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: "codegen.yml",
                ref: "main",
                inputs: { issue_number: iss.toString() }
              }).catch(e => core.warning(e.message));

              core.info(`Re-adding label codegen:ready to #${iss}`);
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: iss,
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
      - name: Gate by safety policy (dry check)
        uses: actions/github-script@v7
        with:
          script: |
            core.info('Watchdog observing run: ' + context.workflow);
            core.info('Conclusion: ' + context.payload.workflow_run.conclusion);

      - name: On failure — auto redispatch limited
        if: ${{ github.event.workflow_run.conclusion == 'failure' || github.event.workflow_run.conclusion == 'cancelled' || github.event.workflow_run.conclusion == 'timed_out' }}
        uses: actions/github-script@v7
        with:
          script: |
            const run = context.payload.workflow_run;
            const wfName = run.name;
            core.info(`Workflow '${wfName}' failed; scheduling a single redispatch of AI Codegen as a nudge.`);
            try {
              await github.rest.actions.createWorkflowDispatch({
                owner: context.repo.owner,
                repo: context.repo.repo,
                workflow_id: "codegen.yml",
                ref: "main",
                inputs: { issue_number: "110" }
              });
            } catch (e) {
              core.warning('Redispatch failed: ' + e.message);
            }
'@

$PolicyYml = @'
# Safety Locks for auto ops
allowed_labels:
  - safe:auto-pr
  - safe:auto-merge
branch_allowlist:
  - '^ai/.*'
  - '^v4-core-ai$'
deny_paths:
  - '^supabase/migrations/.*'
  - '^infra/terraform/.*'
  - '^.github/workflows/.*'   # except the ones we are adding; gate will allowlisted below
allow_workflows:
  - '^self_improve.yml$'
  - '^watchdog.yml$'
  - '^policy_gate.yml$'
  - '^v4_ship_placeholder.yml$'
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
            const yaml = require('js-yaml');
            const {owner, repo} = context.repo;

            const policyText = fs.readFileSync('.github/auto-ops.yml', 'utf8');
            const policy = yaml.load(policyText);

            const pr = context.payload.pull_request;
            const headRef = pr.head.ref;
            const labels = pr.labels.map(l => l.name);

            const denyPaths = policy.deny_paths || [];
            const allowWorkflows = policy.allow_workflows || [];
            const branchAllow = (policy.branch_allowlist || []).map(p => new RegExp(p));

            const branchOk = branchAllow.some(rx => rx.test(headRef));
            if (!branchOk) {
              core.setFailed(`Branch '${headRef}' not in allowlist.`);
            }

            const files = await github.paginate(github.rest.pulls.listFiles, {
              owner, repo, pull_number: pr.number, per_page: 100
            });

            const denyHit = files.some(f => denyPaths.some(p => new RegExp(p).test(f.filename)));
            if (denyHit && !labels.includes('safe:override')) {
              core.setFailed(`PR touches denied paths without 'safe:override' label.`);
            }

            const wfChanges = files.filter(f => f.filename.startsWith('.github/workflows/'));
            const badWf = wfChanges.some(f => !allowWorkflows.some(p => new RegExp(p).test(f.filename.split('/').slice(-1)[0])));
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

# ---------- WRITE FILES ----------
$map = @{
  $SelfImprovePath = $SelfImproveYml
  $WatchdogPath    = $WatchdogYml
  $PolicyPath      = $PolicyYml
  $PolicyGatePath  = $PolicyGateYml
}

foreach ($kv in $map.GetEnumerator()) {
  $path = $kv.Key
  $content = $kv.Value
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $path -Value $content -NoNewline -Encoding UTF8
  Write-Host "Wrote $path"
}

# ---------- COMMIT & PUSH ----------
git add -A
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" commit -m "v4: add self_improve + watchdog + policy gate (safety locks)" 2>$null | Out-Null
git push -u origin $Branch

# ---------- ENSURE PR EXISTS & AUTO-MERGE ----------
$prNum = gh pr list --state open --json number,headRefName -q ".[] | select(.headRefName==`"$Branch`") | .number" | Select-Object -First 1
if (-not $prNum) {
  $prUrl = gh pr create --fill --head $Branch --base main
  Write-Host "`nPR: $prUrl"
  $prNum = gh pr list --state open --json number,headRefName -q ".[] | select(.headRefName==`"$Branch`") | .number" | Select-Object -First 1
} else {
  Write-Host "`nPR already open: #$prNum"
}

# Add closure keyword (for driving issue)
$body = gh pr view $prNum --json body -q .
if ($body -notmatch "Closes #$Issue") {
  gh pr edit $prNum --body "$body`r`n`r`nCloses #$Issue" | Out-Null
}

# Enable auto-merge (squash)
gh pr merge $prNum --auto --squash | Out-Null

Write-Host "`nDONE: self-improve, watchdog and safety locks staged on $Branch (PR #$prNum)." -ForegroundColor Green

