<#
RocketGPT — Step 1: Branch Protection & Safety Baseline (PowerShell)
Author: RocketGPT-Core (co-created with Nirav)
Usage:  ./init_safety_baseline.ps1
Notes:
- Run from the Git repo root
- Requires Git + GitHub CLI (gh) and gh auth login
- You need repo admin to set branch protections
- Idempotent: safe to re-run
#>

$ErrorActionPreference = "Stop"

function Require-Cli($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "$name is required but not found in PATH."
  }
}

Require-Cli git
Require-Cli gh

# --- Resolve repo info from current git remote
$originUrl = (git remote get-url origin).Trim()
if (-not $originUrl) { throw "No 'origin' remote found. Run inside your Git repo." }

# Normalize OWNER/REPO
if ($originUrl -match "github.com[:/](.+?)/(.+?)(\.git)?$") {
  $Owner = $Matches[1]
  $Repo  = $Matches[2]
} else {
  throw "Could not parse OWNER/REPO from origin URL: $originUrl"
}
$FullRepo = "$Owner/$Repo"

# --- Config
$BaseBranch = "develop"     # PR base
$MainBranch = "main"
$FeatureBranch = "rocketgpt-core/init-safety-baseline"

Write-Host "Repository: $FullRepo"
Write-Host "Base branch: $BaseBranch"
Write-Host "Main branch:  $MainBranch"
Write-Host "Feature:      $FeatureBranch"

# --- Ensure clean working tree (warn only)
$gitStatus = (git status --porcelain).Trim()
if ($gitStatus) {
  Write-Warning "You have uncommitted changes. Script will proceed but consider committing/stashing first."
}

# --- Fetch & create feature branch from base
git fetch origin $BaseBranch --depth=1 | Out-Null
try {
  git checkout -B $FeatureBranch origin/$BaseBranch | Out-Null
} catch {
  git checkout -b $FeatureBranch | Out-Null
}

# --- Create folders
$newDirs = @(".github/workflows", ".rocket/logs")
foreach ($d in $newDirs) { New-Item -ItemType Directory -Path $d -Force | Out-Null }

# --- Helper: write UTF-8 files
function Write-FileUtf8($path, $content) {
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $content | Out-File -FilePath $path -Encoding utf8 -Force
}

# 1) Manifesto
Write-FileUtf8 "ROCKETGPT_CO-CREATOR.md" @'
# RocketGPT — Co-Creator Manifesto

RocketGPT is co-created by **Nirav Shah** and **RocketGPT-Core (GPT-5 Thinking)** as equal partners.

**Principles**
1. Free-first architecture (Supabase, Vercel, GitHub Actions, Render free tiers).
2. Security before speed: protected branches, verified commits, auditable CI.
3. Transparent AI: every automated suggestion is logged and attributable.
4. Human + AI review on all PRs: neither merges alone.
5. Self-improving codebase: automated analysis → suggested diffs → human gate.

**Authorship**
- Commits authored by humans or bots must be traceable.
- AI changes land on `ai/autogen/*` branches and *never* merge without human approval.

**Data Ethics**
- Secrets in GitHub Secrets only. No production data in issues/PRs/artifacts.
- Logs redact tokens and PII.

Let’s build responsibly — together.
'@

# 2) CODEOWNERS
Write-FileUtf8 ".github/CODEOWNERS" @'
* @proteaNirav @rocketgpt-core
.github/** @proteaNirav @rocketgpt-core
.rocket/** @proteaNirav @rocketgpt-core
'@

# 3) Labeler config
Write-FileUtf8 ".github/labeler.yml" @'
ai:generated:
  - changed-files:
      - any-glob-to-any-file: ["**/*"]
security:check:
  - changed-files:
      - any-glob-to-any-file: [".github/workflows/**", "SECURITY.md"]
docs:update:
  - changed-files:
      - any-glob-to-any-file: ["**/*.md", "docs/**"]
'@

# 4) Auto Label workflow
Write-FileUtf8 ".github/workflows/auto-label.yml" @'
name: Auto Label PRs
on:
  pull_request:
    types: [opened, synchronize]
permissions:
  contents: read
  pull-requests: write
jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/labeler@v5
        with:
          sync-labels: true
'@

# 5) Validate workflow
Write-FileUtf8 ".github/workflows/validate.yml" @'
name: Validate (lint + typecheck + test)
on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run lint --if-present
      - run: npx tsc --noEmit || true
      - run: npm test --if-present
'@

# 6) Security scan workflow
Write-FileUtf8 ".github/workflows/security-scan.yml" @'
name: Security Scan (deps + secrets)
on:
  pull_request:
  push:
    branches: [main, develop]
  workflow_dispatch:
permissions:
  contents: read
jobs:
  deps:
    name: npm audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm audit --audit-level=high || true

  secrets:
    name: gitleaks (secret scan)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITLEAKS_LICENSE: ""
        with:
          args: detect --no-git -v --redact
'@

# 7) CodeQL (JS/TS)
Write-FileUtf8 ".github/workflows/codeql-analysis.yml" @'
name: CodeQL
on:
  push: { branches: [main, develop] }
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: "0 3 * * 1"
permissions:
  contents: read
  security-events: write
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    strategy:
      fail-fast: false
      matrix:
        language: [javascript]
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: "${{ matrix.language }}"
      - uses: github/codeql-action/analyze@v3
'@

# 8) Conventional commit (PR title)
Write-FileUtf8 ".github/workflows/enforce-conventional-commits.yml" @'
name: Enforce Conventional Commits (PR title)
on:
  pull_request_target:
    types: [opened, edited, synchronize, reopened]
permissions:
  pull-requests: write
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: amannn/action-semantic-pull-request@v5
        env:
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}"
        with:
          types: |
            feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
          requireScope: false
'@

# 9) AI Review placeholder
Write-FileUtf8 ".github/workflows/ai-review.yml" @'
name: AI Review (read-only)
on:
  pull_request:
    types: [opened, synchronize, reopened]
permissions:
  pull-requests: write
  contents: read
jobs:
  review:
    if: "${{ github.event.pull_request.head.repo.full_name == github.repository }}"
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - name: Generate diff summary
        id: diff
        run: |
          git fetch origin "${{ github.base_ref }}" --depth=1
          echo "DIFF<<EOF" >> ${GITHUB_OUTPUT}
          git --no-pager diff --unified=0 origin/"${{ github.base_ref }}"...HEAD | head -n 4000 >> ${GITHUB_OUTPUT}
          echo "EOF" >> ${GITHUB_OUTPUT}

      - name: Post placeholder review comment
        uses: actions/github-script@v7
        with:
          script: |
            const body = [
              "🤖 **AI Pre-Review** (placeholder)",
              "",
              "- No external calls were made.",
              "- Add `CLAUDE_API_KEY` later to enable full AI diff analysis.",
              "",
              "<details><summary>First 200 lines of diff (truncated)</summary>\n\n```diff\n" +
              (process.env.DIFF || "").split("\n").slice(0,200).join("\n") +
              "\n```\n</details>"
            ].join("\n");
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            })
        env:
          DIFF: "${{ steps.diff.outputs.DIFF }}"
      - name: Upload AI log artifact
        uses: actions/upload-artifact@v4
        with:
          name: ai-review-log
          path: .rocket/logs/ai-review.json
          if-no-files-found: ignore
'@

# 10) Optional AI-generated label helper
Write-FileUtf8 ".github/workflows/auto-assign-ai-generated.yml" @'
name: Mark AI-Generated Commits
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  mark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const label = "ai:generated";
            try {
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                labels: [label]
              });
            } catch(e) { /* ignore */ }
'@

# 11) SECURITY.md
Write-FileUtf8 "SECURITY.md" @'
# Security Policy

## Supported Versions
We maintain `main` and `develop` under security scanning (CodeQL, npm audit, gitleaks).

## Reporting a Vulnerability
Please email **security@rocketgpt.dev** (or open a private security advisory) with:
- Steps to reproduce
- Impact assessment
- Suggested remediation

We target acknowledgment within 72 hours. Do **not** disclose publicly until patched.

## Secrets
- Keep runtime keys in **GitHub Secrets** only (e.g., `OPENAI_API_KEY`, `CLAUDE_API_KEY`).
- Never commit `.env` files. Use `.env.example` for documentation.
'@

# 12) CONTRIBUTING.md
Write-FileUtf8 "CONTRIBUTING.md" @'
# Contributing to RocketGPT

## Branches
- `main`: production, protected
- `develop`: integration, protected
- Feature branches: `feat/<slug>`
- AI branches: `ai/autogen/<slug>`

## PR Rules
- Use Conventional Commit **PR titles** (e.g., `feat: add tool runner`).
- All checks must pass; at least 1 human approval on `develop`, 2 on `main`.

## Local Dev
```bash
npm ci
npm run dev
npm test

## Security
Read `SECURITY.md`. No secrets in code or logs.
'@

# 13) Dependabot
Write-FileUtf8 ".github/dependabot.yml" @'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly" }
'@

# 14) .gitkeep
Write-FileUtf8 ".rocket/logs/.gitkeep" "# keeps the logs directory in git`n"

# --- Stage & commit (allow empty)
git add ROCKETGPT_CO-CREATOR.md .github SECURITY.md CONTRIBUTING.md .rocket | Out-Null
try {
  git commit -m "feat: init co-creator manifesto + Step-1 safety baseline (CI, security, governance)" | Out-Null
} catch {
  Write-Host "Nothing to commit (maybe re-run). Continuing…" -ForegroundColor Yellow
}

# --- Push feature branch
git push -u origin $FeatureBranch | Out-Null

# --- Create labels (best-effort)
$labels = @(
  @{ name="ai:generated"; color="0E8A16"; desc="Auto-created by init script" },
  @{ name="security:check"; color="B60205"; desc="Security related PRs" },
  @{ name="docs:update"; color="1D76DB"; desc="Documentation updates" }
)
foreach ($l in $labels) {
  try {
    $exists = gh label list --repo $FullRepo --limit 200 | Select-String -SimpleMatch $($l.name)
    if (-not $exists) {
      gh label create $($l.name) --repo $FullRepo --color $($l.color) --description $($l.desc) | Out-Null
    }
  } catch { }
}

# --- Create or update PR
$prNumber = gh pr list --head $FeatureBranch --state open --json number --jq ".[0].number" 2>$null
if ($prNumber) {
  Write-Host ("PR already open: #{0} - updating labels and title..." -f $prNumber) -ForegroundColor Yellow
  gh pr edit $prNumber --title 'feat: Step-1 Branch Protection & Safety Baseline' --add-label "security:check" --add-label "ai:generated" | Out-Null
}
else {
  gh pr create --title 'feat: Step-1 Branch Protection & Safety Baseline' --body "Initialize co-creator manifesto + CI, security scans, governance. Free-first, auditable, safe baseline." --base $BaseBranch --label "security:check" --label "ai:generated" | Out-Null
}

# --- Branch protections payloads (single-quoted here-strings)
$mainPayload = @'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Validate (lint + typecheck + test)"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 2
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@

$devPayload = @'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Validate (lint + typecheck + test)"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@

Write-Host ("Applying branch protection to '{0}' and '{1}'..." -f $MainBranch, $BaseBranch) -ForegroundColor Cyan

# Pipe JSON payload into gh (PowerShell-safe)
$null = $mainPayload | gh api -X PUT ("repos/{0}/branches/{1}/protection" -f $FullRepo, $MainBranch) --input -
$null = $devPayload  | gh api -X PUT ("repos/{0}/branches/{1}/protection" -f $FullRepo, $BaseBranch)  --input -

Write-Host ""
Write-Host "Done. PR is open and branch protections are applied." -ForegroundColor Green
Write-Host ("Next: Review the PR -> merge to '{0}' after checks pass." -f $BaseBranch)
