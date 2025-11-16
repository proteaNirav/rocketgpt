# RUN: Set-ExecutionPolicy -Scope Process Bypass; ./install_hands_off_mode.ps1
$ErrorActionPreference = "Stop"

function Need($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Need git; Need gh

# Detect repo + default branch
$repo = (git remote get-url origin) -replace '.*github.com[:/]|\.git$',''
if (-not $repo) { throw "No origin remote found." }
$default = gh repo view --json defaultBranchRef -q .defaultBranchRef.name
if (-not $default) { $default = "main" }

Write-Host "Repo: $repo" -ForegroundColor Cyan
Write-Host "Default branch: $default" -ForegroundColor Cyan

# Enable Allow auto-merge (one-time)
try { gh api -X PATCH "repos/$repo" -f allow_auto_merge=true | Out-Null } catch { }

# Ensure labels
$labels = @(
  @{ name="ai:auto-merge"; color="0E8A16"; desc="Auto-merge when green" },
  @{ name="codegen:ready"; color="1D76DB"; desc="Trigger auto codegen" }
)
foreach($l in $labels){
  $exists = gh label list --repo $repo --limit 200 | Select-String -SimpleMatch $($l.name)
  if (-not $exists) { try { gh label create $($l.name) --repo $repo --color $($l.color) --description $($l.desc) | Out-Null } catch {} }
}

# Create/checkout feature branch from default
git fetch origin $default --depth=1 | Out-Null
$feature = "rocketgpt-core/hands-off-mode"
git checkout -B $feature "origin/$default" | Out-Null

# ---------- YAML contents (single-quoted here-strings to preserve ${{ }} ) ----------
$ship = @'
name: RocketGPT Ship Issue
on:
  workflow_dispatch:
    inputs:
      issue_number:
        description: "Issue number to ship"
        required: true
        type: string
permissions:
  contents: write
  pull-requests: write
  issues: write
jobs:
  ship:
    runs-on: ubuntu-latest
    steps:
      - name: Parse input
        id: inp
        run: echo "ISSUE=${{ github.event.inputs.issue_number }}" >> $GITHUB_OUTPUT

      - name: Label issue to trigger codegen
        uses: actions/github-script@v7
        with:
          script: |
            const iss = parseInt('${{ steps.inp.outputs.ISSUE }}', 10);
            await github.rest.issues.addLabels({
              owner: context.repo.owner, repo: context.repo.repo, issue_number: iss,
              labels: ['codegen:ready']
            });

      - name: Wait for PR created by codegen
        id: wait
        uses: actions/github-script@v7
        with:
          script: |
            const iss = parseInt('${{ steps.inp.outputs.ISSUE }}', 10);
            let pr = null;
            for (let i=0;i<30;i++){
              const search = await github.rest.search.issuesAndPullRequests({
                q: `repo:${context.repo.owner}/${context.repo.repo} is:pr in:title ${iss}`,
                per_page: 5
              });
              const open = search.data.items.find(x => x.state === 'open');
              if (open) { pr = open; break; }
              await new Promise(r => setTimeout(r, 10000));
            }
            if (!pr) core.setFailed('No PR created for this issue yet.');
            core.setOutput('pr_number', pr.number.toString());

      - name: Add auto-merge label
        uses: actions/github-script@v7
        with:
          script: |
            const n = parseInt('${{ steps.wait.outputs.pr_number }}', 10);
            await github.rest.issues.addLabels({
              owner: context.repo.owner, repo: context.repo.repo, issue_number: n,
              labels: ['ai:auto-merge']
            });

      - name: Enable auto-merge (squash)
        uses: actions/github-script@v7
        with:
          script: |
            const n = parseInt('${{ steps.wait.outputs.pr_number }}', 10);
            const prQ = await github.graphql(
              `query($o:String!,$n:String!,$num:Int!){repository(owner:$o,name:$n){pullRequest(number:$num){id}}}`,
              { o: context.repo.owner, n: context.repo.repo, num: n }
            );
            await github.graphql(
              `mutation($pr:ID!){ enablePullRequestAutoMerge(input:{ pullRequestId:$pr, mergeMethod:SQUASH }){ clientMutationId } }`,
              { pr: prQ.repository.pullRequest.id }
            );
'@

$update = @'
name: Auto Update PR Branches
on:
  push:
    branches: [ "main", "develop" ]
  schedule:
    - cron: "*/30 * * * *"
permissions:
  contents: write
  pull-requests: write
jobs:
  update-branches:
    runs-on: ubuntu-latest
    steps:
      - name: Update stale PR branches from same repo
        uses: actions/github-script@v7
        with:
          script: |
            const bases = ["main","develop"];
            for (const base of bases) {
              const prs = await github.paginate(github.rest.pulls.list, {
                owner: context.repo.owner, repo: context.repo.repo, state: "open", base, per_page: 100
              });
              for (const pr of prs) {
                if (!pr.head.repo || pr.head.repo.full_name !== `${context.repo.owner}/${context.repo.repo}`) continue;
                try {
                  await github.rest.pulls.updateBranch({
                    owner: context.repo.owner, repo: context.repo.repo, pull_number: pr.number
                  });
                  core.notice(`Updated PR #${pr.number} against ${base}`);
                } catch (e) {
                  core.warning(`PR #${pr.number} not updated: ${e.message}`);
                }
              }
            }
'@

$sync = @'
name: Branch Sync (main to develop)
on:
  push:
    branches: [ "main" ]
  schedule:
    - cron: "15 * * * *"
permissions:
  contents: write
  pull-requests: write
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Check divergence and open PR if needed
        uses: actions/github-script@v7
        with:
          script: |
            const owner = context.repo.owner;
            const repo  = context.repo.repo;
            try { await github.rest.repos.getBranch({ owner, repo, branch: "develop" }); }
            catch { core.setFailed("Branch 'develop' not found."); return; }
            const existing = await github.paginate(github.rest.pulls.list, {
              owner, repo, state: "open", base: "develop", per_page: 100
            });
            const found = existing.find(p => p.title.includes("chore: sync main → develop"));
            if (found) { core.notice(`Sync PR already open: #${found.number}`); return; }
            const title = "chore: sync main → develop";
            const body  = "Automated sync: bring main-only commits into develop.";
            const { data: pr } = await github.rest.pulls.create({
              owner, repo, title, head: "main", base: "develop", body, maintainer_can_modify: true, draft: false
            });
            await github.rest.issues.addLabels({ owner, repo, issue_number: pr.number, labels: ["ai:auto-merge"] });
            try {
              const prQ = await github.graphql(
                `query($o:String!,$n:String!,$num:Int!){repository(owner:$o,name:$n){pullRequest(number:$num){id}}}`,
                { o: owner, n: repo, num: pr.number }
              );
              await github.graphql(
                `mutation($pr:ID!){ enablePullRequestAutoMerge(input:{ pullRequestId:$pr, mergeMethod:SQUASH }){ clientMutationId } }`,
                { pr: prQ.repository.pullRequest.id }
              );
              core.notice(`Opened + auto-merge enabled for PR #${pr.number}`);
            } catch (e) {
              core.warning(`Opened PR #${pr.number}, but auto-merge not enabled: ${e.message}`);
            }
'@

# ---------- Write files (UTF-8) ----------
New-Item -ItemType Directory -Force -Path ".github/workflows" | Out-Null
Set-Content -LiteralPath ".github/workflows/ship-issue.yml"     -Value $ship   -Encoding UTF8
Set-Content -LiteralPath ".github/workflows/auto-update-pr.yml" -Value $update -Encoding UTF8
Set-Content -LiteralPath ".github/workflows/branch-sync.yml"    -Value $sync   -Encoding UTF8

# ---------- Commit, push, PR ----------
git add .github/workflows | Out-Null
git commit -m "feat(ci): Hands-off mode (Ship Issue, Auto-Update PRs, Branch Sync)" | Out-Null
git push -u origin $feature | Out-Null

$prUrl = gh pr create --base $default --head $feature `
  --title "feat(ci): Hands-off mode (Ship Issue, Auto-Update PRs, Branch Sync)" `
  --body "Installs one-click Ship Issue + PR auto-update + main→develop sync."
Write-Host "`nPR opened: $prUrl" -ForegroundColor Green
Write-Host "Merge it (use ./gh_safe_merge.ps1 <num> $default -NoPrompt if protected)." -ForegroundColor Yellow
