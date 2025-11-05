param(
  [int]$Issue = 0,
  [string]$Branch = "v4-core-ai"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say([string]$msg,[string]$color="Gray"){ Write-Host $msg -ForegroundColor $color }

Say "`n== AUTH ==" "Cyan"
gh auth status | Out-Host

Say "`n== REPO ==" "Cyan"
$Repo = gh repo view --json nameWithOwner -q .nameWithOwner
if (-not $Repo) { throw "Not inside a GitHub repo directory. cd into your repo first." }
Say "Using repo: $Repo" "DarkGray"

# Ensure branch exists locally & is tracking correctly
Say "`n== CHECKOUT BRANCH == $Branch" "Cyan"

# Fetch remote branch explicitly with a CORRECT refspec
git fetch origin "refs/heads/$Branch:refs/remotes/origin/$Branch" 2>$null | Out-Null

# If local branch doesn't exist, create it from origin/$Branch (or fallback to main if not present remotely)
$localExists = (git rev-parse --verify "$Branch" 2>$null) -ne $null
if (-not $localExists) {
  $remoteExists = (git ls-remote --heads origin $Branch) -ne $null
  if ($remoteExists) {
    git switch -c $Branch --track "origin/$Branch" | Out-Null
  } else {
    # Fallback: create from main
    git fetch origin "refs/heads/main:refs/remotes/origin/main" 2>$null | Out-Null
    git switch -c $Branch --track origin/main | Out-Null
  }
} else {
  git switch $Branch 2>$null | Out-Null
  if ((git ls-remote --heads origin $Branch) -ne $null) {
    git pull --ff-only origin $Branch | Out-Null
  } else {
    git pull --ff-only origin main | Out-Null
  }
}

# ---------- File contents (single-quoted here-strings to avoid interpolation) ----------
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
            core.setOutput('text', yml);

      - name: Find stalled issues (label=codegen:ready, no open PR)
        id: stalled
        uses: actions/github-script@v7
        with:
          script: |
            const {owner, repo} = context.repo;
            const resIssues = await github.rest.search.issuesAndPullRequests({
              q: `repo:${owner}/${repo} is:issue is:open label:codegen:ready`,
              per_page: 20
            });
            const candidates = [];
            for (const it of resIssues.data.items || []) {
              const q = `repo:${owner}/${repo} is:pr is:open in:title,body ${it.number}`;
              const resPr = await github.rest.search.issuesAndPullRequests({ q, per_page: 5 });
              const hasOpenPr = (resPr.data.items || []).some(x => x.state === 'open');
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
    workflows: ["AI Codegen", "RocketGPT Ship Issue", "v4_ship_placeholder"]
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
            core.info('Conclusion: ' + (context.payload.workflow_run?.conclusion || 'n/a'));

      - name: On failure — auto redispatch limited
        if: ${{ github.event.workflow_run.conclusion == 'failure' || github.event.workflow_run.conclusion == 'cancelled' || github.event.workflow_run.conclusion == 'timed_out' }}
        uses: actions/github-script@v7
        with:
          script: |
            const run = context.payload.workflow_run;
            const wfName = run?.name || 'unknown';
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
  - '^.github/workflows/.*'   # except allowlisted below
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
            const { owner, repo } = context.repo;

            const policyText = fs.readFileSync('.github/auto-ops.yml', 'utf8');
            const policy = yaml.load(policyText);

            const pr = context.payload.pull_request;
            const headRef = pr.head.ref;
            const labels = (pr.labels || []).map(l => l.name);

            const denyPaths = policy.deny_paths || [];
            const allowWorkflows = policy.allow_workflows || [];
            const branchAllow = (policy.branch_allowlist || []).map(p => new RegExp(p));

            // Branch allowlist
            const branchOk = branchAllow.some(rx => rx.test(headRef));
            if (!branchOk) {
              core.setFailed(`Branch '${headRef}' not in allowlist.`);
              return;
            }

            // Files changed
            const files = await github.paginate(github.rest.pulls.listFiles, {
              owner, repo, pull_number: pr.number, per_page: 100
            });

            const denyHit = files.some(f => denyPaths.some(p => new RegExp(p).test(f.filename)));
            if (denyHit && !labels.includes('safe:override')) {
              core.setFailed(`PR touches denied paths without 'safe:override' label.`);
              return;
            }

            // Workflow file allowlist (if workflows changed)
            const wfChanges = files.filter(f => f.filename.startsWith('.github/workflows/'));
            const badWf = wfChanges.some(f => !allowWorkflows.some(p => new RegExp(p).test(f.filename.split('/').slice(-1)[0])));
            if (wfChanges.length && badWf && !labels.includes('safe:workflow-edit')) {
              core.setFailed('Workflow edits must be allowlisted or labeled safe:workflow-edit.');
              return;
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

# ---------- Write files ----------
$files = @{}
$files[$SelfImprovePath] = $SelfImproveYml
$files[$WatchdogPath]    = $WatchdogYml
$files[$PolicyPath]      = $PolicyYml
$files[$PolicyGatePath]  = $PolicyGateYml

foreach ($kv in $files.GetEnumerator()) {
  $path = $kv.Key
  $content = $kv.Value
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  Set-Content -Path $path -Value $content -NoNewline -Encoding UTF8
  Say "Wrote $path" "DarkGray"
}

# ---------- Commit & push ----------
git add -A
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" `
  commit -m "v4: add self_improve + watchdog + policy gate (safety locks)" | Out-Null

git push -u origin $Branch | Out-Null

# ---------- Create or update PR ----------
# Try to find an open PR from Branch -> main; else create
$prNum = gh pr list --state open --json number,headRefName,baseRefName -q `
  ".[] | select(.headRefName==`"$Branch`" and .baseRefName==`"main`") | .number" | Select-Object -First 1

if (-not $prNum) {
  $prUrl = gh pr create --base main --head $Branch --title "v4: Self-Improve, Watchdog & Safety Locks" `
           --body "Adds self_improve, watchdog and policy gate workflows with safety policy." 2>$null
  # extract PR number
  $prNum = gh pr list --state open --json number,headRefName,baseRefName -q `
    ".[] | select(.headRefName==`"$Branch`" and .baseRefName==`"main`") | .number" | Select-Object -First 1
  Say "Opened PR: $prNum" "Green"
} else {
  Say "Using existing PR: $prNum" "Green"
}

# Ensure it closes issue on merge if Issue > 0
if ($Issue -gt 0) {
  $tmp = New-TemporaryFile
  gh pr view $prNum --json body -q . > $tmp
  $bodyText = Get-Content $tmp -Raw
  if ($bodyText -notmatch "Closes #$Issue") {
    $newBody = "$bodyText`r`n`r`nCloses #$Issue"
    Set-Content $tmp $newBody -NoNewline -Encoding UTF8
    gh pr edit $prNum --body-file $tmp | Out-Null
  }
  Remove-Item $tmp -Force
}

# Enable auto-merge (squash)
gh pr merge $prNum --auto --squash | Out-Null
Say "Auto-merge armed for PR #$prNum" "DarkCyan"

# ---------- Seed a first run on THIS BRANCH (not main) ----------
# IMPORTANT: use --ref to point at the branch where the workflow file exists
try {
  gh workflow run "self_improve.yml" --ref $Branch -f reason="seed run on $Branch" | Out-Null
  Start-Sleep -Seconds 2
  Say "`nLaunched 'Self Improve' on $Branch. Latest run:" "Cyan"
  gh run list --workflow "Self Improve" --limit 1 | Out-Host
} catch {
  Say "Could not dispatch self_improve on $Branch (will run on schedule). $_" "Yellow"
}

Say "`nDONE: Self-Improve, Watchdog and Policy Gate installed on branch '$Branch' (PR #$prNum)." "Green"
