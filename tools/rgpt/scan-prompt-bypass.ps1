param(
  [string]$Root = "."
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Resolve-RgptRootPath([string]$Root) {
  return (Resolve-Path -LiteralPath $Root -ErrorAction Stop | Select-Object -ExpandProperty Path)
}

function Fail([string]$msg) {
  Write-Host $msg -ForegroundColor Red
  exit 1
}

# [RGPT-S20C] Scope control: only scan source files in relevant directories
# Extensions to scan (outbound/provider code surfaces)
$scanExtensions = @(".ts", ".tsx", ".js", ".jsx")

# Directory ignore patterns (relative paths, case-insensitive)
$ignoreDirPatterns = @(
  "^docs[/\\]",
  "^reports[/\\]",
  "^ci_logs[/\\]",
  "^workflow-archive[/\\]",
  "^rootdocs_migrated[/\\]",
  "^\.ops[/\\]",
  "^\.github[/\\]",
  "^node_modules[/\\]",
  "^\.next[/\\]",
  "^dist[/\\]",
  "^build[/\\]",
  "^coverage[/\\]",
  "^out[/\\]",
  "^\.git[/\\]",
  "[/\\]node_modules[/\\]",
  "[/\\]\.next[/\\]",
  "[/\\]dist[/\\]",
  "[/\\]build[/\\]",
  "[/\\]coverage[/\\]"
)

# File ignore patterns (by extension or name)
$ignoreFilePatterns = @(
  "\.log$",
  "\.patch$",
  "\.bak$",
  "\.snapshot\.txt$",
  "\.d\.ts$"
)

# [RGPT-S20C] ALLOWLIST: Directories where prompt construction is permitted
# These are the approved prompt definition surfaces
$promptAllowlistPatterns = @(
  "src/rgpt/prompt-formulator",
  "rocketgpt-agents/providers",
  "rocketgpt-agents/runners",
  "app/api/_lib",
  "lib/llm/providers",
  "lib/llm/router",
  "lib/planner",
  "app/api/demo",
  "app/api/planner",
  "scripts/ui-healer"
)

# [RGPT-S20C] Fast file enumeration: git-tracked files only
$repoRoot = Resolve-RgptRootPath $Root

$files = @()
$gitFiles = @(git -C $repoRoot ls-files)

foreach ($rel in $gitFiles) {
  if ([string]::IsNullOrWhiteSpace($rel)) { continue }

  # Normalize path separators for cross-platform matching
  $relNorm = $rel -replace '\\', '/'

  # Check extension filter first (most files will be filtered here)
  $ext = [System.IO.Path]::GetExtension($rel).ToLower()
  if ($scanExtensions -notcontains $ext) { continue }

  # Check directory ignore patterns
  $skipDir = $false
  foreach ($dirPat in $ignoreDirPatterns) {
    if ($relNorm -match $dirPat) {
      $skipDir = $true
      break
    }
  }
  if ($skipDir) { continue }

  # Check file ignore patterns
  $skipFile = $false
  foreach ($filePat in $ignoreFilePatterns) {
    if ($relNorm -match $filePat) {
      $skipFile = $true
      break
    }
  }
  if ($skipFile) { continue }

  # Build full path and verify existence
  $p = Join-Path $repoRoot $rel
  if (Test-Path -LiteralPath $p) {
    $files += @{
      Item = (Get-Item -LiteralPath $p)
      RelPath = $relNorm
    }
  }
}

Write-Host "Scanning $($files.Count) source files for prompt bypass..." -ForegroundColor Cyan

# Heuristics: outbound/provider patterns (indicate actual LLM API calls)
$outboundPatterns = @(
  "api\.openai\.com",
  "api\.anthropic\.com",
  "chat\.completions\.create",
  "messages\.create\s*\(",
  "responses\.create\s*\(",
  "x-api-key",
  "anthropic-version"
)

# Heuristics: prompt construction patterns (building LLM message arrays)
$promptPatterns = @(
  'role\s*:\s*[`''"](system|developer)[`''"]',
  'SYSTEM_PROMPT\s*=',
  'systemPrompt\s*[:=]',
  'system\s*:\s*[`''"][^`''"]{20,}'
)

# Guard function (only enforce Rule A if it exists in codebase)
$guardNeedle = "assertPromptFromFormulator"
$guardDefPattern = "function\s+assertPromptFromFormulator\s*\(|export\s+(const|function)\s+assertPromptFromFormulator"
$guardExists = $false
foreach ($fileInfo in $files) {
  $p = $fileInfo.Item.FullName
  if (Test-Path -LiteralPath $p) {
    $content = Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match $guardDefPattern)) {
      $guardExists = $true
      Write-Host "Guard function found: enforcing Rule A" -ForegroundColor Yellow
      break
    }
  }
}

$violations = New-Object System.Collections.Generic.List[string]

foreach ($fileInfo in $files) {
  $f = $fileInfo.Item
  $relPath = $fileInfo.RelPath

  if (-not (Test-Path -LiteralPath $f.FullName)) {
    continue
  }

  $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction Stop
  if ([string]::IsNullOrEmpty($text)) { continue }

  # Check if file is in prompt allowlist
  $isInAllowlist = $false
  foreach ($pat in $promptAllowlistPatterns) {
    if ($relPath -like "*$pat*") {
      $isInAllowlist = $true
      break
    }
  }

  $hasOutbound = $false
  foreach ($p in $outboundPatterns) {
    if ($text -match $p) { $hasOutbound = $true; break }
  }

  $hasPromptBuild = $false
  foreach ($p in $promptPatterns) {
    if ($text -match $p) { $hasPromptBuild = $true; break }
  }

  # Rule A: If guard function exists AND file has outbound AND not in allowlist, require guard
  if ($guardExists -and $hasOutbound -and (-not $isInAllowlist) -and ($text -notmatch $guardNeedle)) {
    $violations.Add("Missing guard in outbound/provider file: $($f.FullName)")
  }

  # Rule B: Prompt construction outside allowlist is forbidden
  if ($hasPromptBuild -and (-not $isInAllowlist)) {
    $violations.Add("Prompt construction detected outside approved directories: $($f.FullName)")
  }
}

if ($violations.Count -gt 0) {
  Write-Host "Prompt bypass scan FAILED:" -ForegroundColor Red
  $violations | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Prompt bypass scan PASSED." -ForegroundColor Green
