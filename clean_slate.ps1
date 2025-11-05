# PURPOSE: Install 3 “hands-off” workflows + enable auto-merge, then open a PR.
# REQS: gh CLI authed, repo clone with origin->GitHub. Run from repo root.

$ErrorActionPreference = "Stop"
function Need($n){ if(-not (Get-Command $n -ErrorAction SilentlyContinue)){ throw "$n is required" } }
Need git; Need gh

# Repo + default branch
$repo = (git remote get-url origin) -replace '.*github.com[:/]|\.git$',''
if (-not $repo) { throw "No origin remote found." }
$default = gh repo view --json defaultBranchRef -q .defaultBranchRef.name
if (-not $default) { $default = "main" }

Write-Host "Repo: $repo" -ForegroundColor Cyan
Write-Host "Default branch: $default" -ForegroundColor Cyan

# Ensure auto-merge allowed (one-time repo setting)
try {
  gh api -X PATCH "repos/$repo" -f allow_auto_merge=true | Out-Null
  Write-Host "✓ Enabled 'Allow auto-merge' on repository" -ForegroundColor Green
} catch { Write-Warning "Could not enable Auto-merge via API; ensure it's enabled in Settings." }

# Ensure labels exist
$labels = @(
  @{ name="ai:auto-merge"; color="0E8A16"; desc="Auto-merge when green" },
  @{ name="codegen:ready"; color="1D76DB"; desc="Trigger auto codegen" }
)
foreach($l in $labels){
  $exists = gh label list --repo $repo --limit 200 | Select-String -SimpleMatch $($l.name)
  if (-not $exists) {
    try { gh label create $($l.name) --repo $repo --color $($l.color) --description $($l.desc) | Out-Null
          Write-Host "✓ Label: $($l.name)" -ForegroundColor Green } catch { }
  }
}

# Create feature branch from default
$feature = "rocketgpt-core/hands-off-mode"
try {
  $sha = gh api "repos/$repo/git/ref/heads/$default" -q .object.sha
  gh api -X POST "repos/$repo/git/refs" -f ref="refs/heads/$feature" -f sha=$sha | Out-Null
  Write-Host "✓ Created branch $feature" -ForegroundColor Green
} catch { Write-Host "ℹ Branch $feature exists; continuing" -ForegroundColor Yellow }

function Put-File($path, $content, $message){
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))
  $sha = ""
  try { $sha = gh api "repos/$repo/contents/$path?ref=$feature" -q .sha 2>$null } catch {}
  $args = @{ message=$message; content=$b64; branch=$feature }
  if ($sha) { $args.sha = $sha }
  $json = $args | ConvertTo-Json -Depth 6
  gh api -X PUT "repos/$repo/contents/$path" --input - <<< $json | Out-Null
  Write-Host ("✓ {0}" -f $path) -ForegroundColor Green
}

# --- Ship Issue workflow ---
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

# --- Auto Update PR Branches ---
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

# --- Branch Sync main -> develop ---
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

# Write files
Put-File ".github/workflows/ship-issue.yml"    $ship   "feat(ci): Ship Issue (codegen -> PR -> auto-merge)"
Put-File ".github/workflows/auto-update-pr.yml" $update "feat(ci): Auto update PR branches"
Put-File ".github/workflows/branch-sync.yml"    $sync   "feat(ci): Branch sync main -> develop"

# Open PR
$prUrl = gh pr create --base $default --head $feature --title "feat(ci): Hands-off mode (Ship Issue, Auto-Update PRs, Branch Sync)" --body "Installs one-click Ship Issue + PR auto-update + main→develop sync."
Write-Host "`nPR opened: $prUrl" -ForegroundColor Green
Write-Host "Merge it (use ./gh_safe_merge.ps1 <num> $default -NoPrompt if protected)." -ForegroundColor Yellow
