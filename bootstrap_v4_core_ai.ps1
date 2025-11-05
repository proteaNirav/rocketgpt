Param(
  [int]$Issue = 0,
  [string]$Branch = "v4-core-ai",
  [string]$Base = "main"
)

$ErrorActionPreference = "Stop"

function Write-Step($msg, $color="Cyan") {
  Write-Host ("`n== {0} ==" -f $msg) -ForegroundColor $color
}

function Require-Tool($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required tool '$name' not found in PATH."
  }
}

Require-Tool git
Require-Tool gh

Write-Step "AUTH"
gh auth status | Out-Host

Write-Step "Detect repository"
$repo = gh repo view --json nameWithOwner -q .nameWithOwner 2>$null
if (-not $repo) { throw "Not inside a GitHub repo folder. cd into your repo and re-run." }
Write-Host "Using repo: $repo" -ForegroundColor DarkGray

# Ensure clean working tree
Write-Step "Ensure clean working tree"
$st = git status --porcelain
if ($st) {
  Write-Host "Stashing local changes..." -ForegroundColor Yellow
  git stash push --include-untracked --all -m "bootstrap_v4_core_ai_stash" | Out-Host
}

# Fetch base and create/switch branch
Write-Step "Create/switch branch '$Branch' from '$Base'"
git fetch origin $Base:refs/remotes/origin/$Base --prune --no-tags | Out-Host
# Use switch if available; fallback to checkout
try {
  git switch -c $Branch origin/$Base 2>$null | Out-Host
} catch {
  git checkout -B $Branch "origin/$Base" | Out-Host
}

# Scaffold folders/files
Write-Step "Scaffold files"

$newFiles = @()

function Ensure-Folder($p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

Ensure-Folder ".github/workflows"
Ensure-Folder "core-ai"

# Minimal self-heal workflow
$wf_selfheal = @"
name: Self-Heal Controller

on:
  # Manual kick or on failures elsewhere (extend later)
  workflow_dispatch:
    inputs:
      reason:
        description: "Why run self-heal?"
        required: false
        default: "manual"
  workflow_run:
    workflows: ["CI"]
    types: [completed]

jobs:
  plan-and-open-issue:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Compute heal plan
        id: plan
        run: |
          echo "PLAN=TODO: analyze recent failures, propose fix steps." >> $GITHUB_OUTPUT

      - name: Open/append issue for tracking
        uses: actions/github-script@v7
        with:
          script: |
            const issueTitle = "Self-Heal: automated diagnostics";
            const body = [
              "### Plan", 
              "```\n" + process.env.PLAN + "\n```",
              "",
              "- [ ] Apply fix",
              "- [ ] Re-run CI",
              "- [ ] Close when green"
            ].join("\n");
            const { data: existing } = await github.rest.search.issuesAndPullRequests({
              q: `repo:${context.repo.owner}/${context.repo.repo} is:issue in:title "${issueTitle}" state:open`,
            });
            if (existing.items.length) {
              const id = existing.items[0].number;
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: id,
                body
              });
              core.setOutput("issue_number", id.toString());
            } else {
              const { data: created } = await github.rest.issues.create({
                owner: context.repo.owner,
                repo: context.repo.repo,
                title: issueTitle,
                body
              });
              core.setOutput("issue_number", created.number.toString());
            }
        env:
         PLAN: "`${{ steps.plan.outputs.PLAN }}`"

"@

$path_wf_selfheal = ".github/workflows/self_heal.yml"
$wf_selfheal | Out-File -Encoding utf8 -FilePath $path_wf_selfheal -Force
$newFiles += $path_wf_selfheal

# Bootstrap readme for v4
$readme = @"
# RocketGPT v4 — Core AI (Self-Healing & Self-Improving)

This branch seeds the **Self-Heal Controller** workflow and a `core-ai/` workspace for future agents:
- Diagnostics & plan generation
- Safe patch PRs with guardrails
- Auto-verification & rollback hooks

Next:
1. Extend \`.github/workflows/self_heal.yml\` to listen to your CI failures.
2. Add agent code in \`core-ai/\` (TypeScript/Python) that:
   - Parses failing logs
   - Suggests patch diffs
   - Opens PRs with tests
3. Wire safety locks: codeowners, mandatory checks, limited write scopes.
"@

$path_readme = "core-ai/README.md"
$readme | Out-File -Encoding utf8 -FilePath $path_readme -Force
$newFiles += $path_readme

# Optional ship workflow placeholder (disabled by default via name suffix)
$wf_ship = @"
name: v4 Ship (placeholder)

on:
  workflow_dispatch:

jobs:
  noop:
    runs-on: ubuntu-latest
    steps:
      - run: echo 'Define ship logic for v4 here.'
"@

$path_wf_ship = ".github/workflows/v4_ship_placeholder.yml"
$wf_ship | Out-File -Encoding utf8 -FilePath $path_wf_ship -Force
$newFiles += $path_wf_ship

Write-Host ("Created files:`n  - " + ($newFiles -join "`n  - ")) -ForegroundColor DarkGray

# Commit
Write-Step "Commit"
git add -A | Out-Host
git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" commit -m "v4 core-ai bootstrap: self-heal workflow + scaffold" | Out-Host

# Push
Write-Step "Push"
git push -u origin $Branch | Out-Host

# Open PR
Write-Step "Open PR"
$title = "v4 Core AI: Self-Healing scaffold"
$body  = "Seed self-heal controller workflow and core-ai workspace."
if ($Issue -gt 0) { $body = "$body`n`nCloses #$Issue" }
$prUrl = gh pr create --title $title --body $body --base $Base --head $Branch 2>$null
if (-not $prUrl) {
  # maybe it already exists
  $existing = gh pr list --state open --search "$Branch in:head-ref" --json url -q ".[0].url" 2>$null
  if ($existing) { $prUrl = $existing }
}

if ($prUrl) {
  Write-Host "PR: $prUrl" -ForegroundColor Green
} else {
  Write-Host "PR could not be created automatically. Please check 'gh pr list'." -ForegroundColor Yellow
}

# Enable auto-merge (squash) if repo policy allows
try {
  if ($prUrl) {
    Write-Step "Enable auto-merge (squash)"
    $prNum = (gh pr view $prUrl --json number -q .number)
    gh pr merge $prNum --auto --squash | Out-Host
  }
} catch {
  Write-Host "Auto-merge couldn't be enabled (repo policy or missing perms). Skipping." -ForegroundColor Yellow
}

# Restore stash if we created one earlier
Write-Step "Restore stashed changes (if any)"
$stashes = git stash list | Select-String "bootstrap_v4_core_ai_stash"
if ($stashes) {
  git stash pop | Out-Host
}

Write-Step "DONE" "Green"
Write-Host "Branch: $Branch" -ForegroundColor Green
if ($prUrl) { Write-Host "PR: $prUrl" -ForegroundColor Green }
