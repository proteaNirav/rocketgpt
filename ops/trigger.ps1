param(
  [Parameter(Mandatory=$true)] [string] $Title,
  [Parameter(Mandatory=$true)] [string] $Goal,
  [string] $Note    = "",
  [string] $Engine  = "anthropic",   # openai|anthropic|google|groq
  [string] $Url     = ""
)

# --- CONFIG: set your repo once ---
$OWNER = "proteaNirav"
$REPO  = "rocketgpt"
$REPO_FULL = "$OWNER/$REPO"

function Require-GH {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "GitHub CLI 'gh' not found. Install: https://cli.github.com/  Then run: gh auth login"
    exit 1
  }
}

Require-GH

# Ensure we can talk to the right repo
gh repo view $REPO_FULL 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Cannot access $REPO_FULL. Run: gh auth login  (select GitHub.com, HTTPS, and auth via browser or token)"
  exit 1
}

# Build the JSON spec we embed in the issue body (fenced)
$spec = @{
  engine = $Engine
  goal   = $Goal
  note   = $Note
  url    = $Url
  requested_by = "$env:USERNAME@$env:COMPUTERNAME"
  timestamp    = (Get-Date).ToString("s")
} | ConvertTo-Json -Depth 6

$body = @"
**Requestor:** $env:USERNAME

**Goal:** $Goal

**Notes:** $Note

**Target URL (if any):** $Url

```json
$spec
