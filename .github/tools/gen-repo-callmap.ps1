param(
  [string]$RepoRoot = (Resolve-Path '.').Path
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$nl = [Environment]::NewLine

function Ensure-Dir([string]$p) {
  if (-not (Test-Path $p)) { New-Item -ItemType Directory -Force -Path $p | Out-Null }
}

function Write-File([string]$name, [string]$content) {
  $outDir = Join-Path $RepoRoot 'docs/_repo_index'
  Ensure-Dir $outDir
  $path = Join-Path $outDir $name
  Set-Content -Path $path -Encoding UTF8 -Value $content
}

function Rel([string]$fullPath) {
  return $fullPath.Replace($RepoRoot + '\', '')
}

function Have-Cmd([string]$name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Run-Rg([string]$pattern, [string[]]$globs) {
  # Returns array of ripgrep lines "path:line:match"
  $args = @('--no-heading','--line-number','--hidden','--glob','!.git/**')
  foreach ($g in $globs) { $args += @('--glob', $g) }
  $args += @($pattern, $RepoRoot)
  $out = & rg @args 2>$null
  if ($LASTEXITCODE -ne 0 -and -not $out) { return @() }
  if ($out -is [string]) { return @($out) }
  return @($out)
}

function Run-SelectString([string]$pattern, [string[]]$includeGlobs) {
  # Fallback: slower, best-effort.
  $hits = @()
  foreach ($g in $includeGlobs) {
    $files = Get-ChildItem -Path $RepoRoot -Recurse -File -Filter $g -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '\\\.git\\' }
    foreach ($f in $files) {
      $m = Select-String -Path $f.FullName -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue
      foreach ($x in $m) {
        $hits += (Rel $x.Path) + ':' + $x.LineNumber + ':' + $x.Line.Trim()
      }
    }
  }
  return $hits
}

$now = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss K')
$branch = '(unknown)'
$head   = '(unknown)'
try { $branch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim() } catch {}
try { $head   = (git rev-parse HEAD 2>$null).Trim() } catch {}

$useRg = Have-Cmd 'rg'
$engine = if ($useRg) { 'rg' } else { 'Select-String' }

# ----------------------------------------
# 1) TypeScript exports/imports map
# ----------------------------------------
$tsExports = @()
$tsImports = @()

if ($useRg) {
  $tsExports += Run-Rg '(?m)^\s*export\s+(type|interface|class|function|const|enum)\s+[A-Za-z0-9_]+' @('*.ts','*.tsx')
  $tsExports += Run-Rg '(?m)^\s*export\s*\{\s*[^}]+\s*\}\s*from\s*' @('*.ts','*.tsx')
  $tsImports += Run-Rg '(?m)^\s*import\s+.+\s+from\s+' @('*.ts','*.tsx')
} else {
  $tsExports += Run-SelectString '^\s*export\s+(type|interface|class|function|const|enum)\s+[A-Za-z0-9_]+' @('*.ts','*.tsx')
  $tsExports += Run-SelectString '^\s*export\s*\{\s*[^}]+\s*\}\s*from\s*' @('*.ts','*.tsx')
  $tsImports += Run-SelectString '^\s*import\s+.+\s+from\s+' @('*.ts','*.tsx')
}

$tsExports = $tsExports | Sort-Object -Unique
$tsImports = $tsImports | Sort-Object -Unique

Write-File 'TS.exports.md' (('# TS Exports' + $nl + $nl + 'Generated: ' + $now + $nl + 'Engine: ' + $engine + $nl + $nl) + (($tsExports | ForEach-Object { '- ' + $_ }) -join $nl))
Write-File 'TS.imports.md' (('# TS Imports' + $nl + $nl + 'Generated: ' + $now + $nl + 'Engine: ' + $engine + $nl + $nl) + (($tsImports | ForEach-Object { '- ' + $_ }) -join $nl))

# ----------------------------------------
# 2) Next.js routes index (route.ts + page.tsx)
# ----------------------------------------
$nextRoot = Join-Path $RepoRoot 'rocketgpt_v3_full/webapp/next'
$routes = @()
if (Test-Path $nextRoot) {
  $appDir = Join-Path $nextRoot 'app'
  if (Test-Path $appDir) {
    $routes = Get-ChildItem $appDir -Recurse -File -Include route.ts,route.js,page.tsx,page.jsx |
      ForEach-Object { Rel $_.FullName } |
      Sort-Object
  }
}
Write-File 'NEXT.routes.md' (('# Next.js Routes + Pages' + $nl + $nl + 'Generated: ' + $now + $nl + $nl) + (($routes | ForEach-Object { '- ' + $_ }) -join $nl))

# ----------------------------------------
# 3) PowerShell script call graph (basic)
#    - Find pwsh -File, powershell -File, & .ps1, dot-sourcing . .ps1
# ----------------------------------------
$psCalls = @()
if ($useRg) {
  $psCalls += Run-Rg '(?i)\bpwsh\b.*\s-File\s+[^\s]+' @('*.ps1','*.psm1')
  $psCalls += Run-Rg '(?i)\bpowershell\b.*\s-File\s+[^\s]+' @('*.ps1','*.psm1')
  $psCalls += Run-Rg '(?m)^\s*\.\s+.*\.ps1\b' @('*.ps1','*.psm1')
  $psCalls += Run-Rg '(?m)^\s*&\s+.*\.ps1\b' @('*.ps1','*.psm1')
} else {
  $psCalls += Run-SelectString '(?i)\bpwsh\b.*\s-File\s+[^\s]+' @('*.ps1','*.psm1')
  $psCalls += Run-SelectString '(?i)\bpowershell\b.*\s-File\s+[^\s]+' @('*.ps1','*.psm1')
  $psCalls += Run-SelectString '^\s*\.\s+.*\.ps1\b' @('*.ps1','*.psm1')
  $psCalls += Run-SelectString '^\s*&\s+.*\.ps1\b' @('*.ps1','*.psm1')
}
$psCalls = $psCalls | Sort-Object -Unique
Write-File 'PS.calls.md' (('# PowerShell Call Map' + $nl + $nl + 'Generated: ' + $now + $nl + 'Engine: ' + $engine + $nl + $nl) + (($psCalls | ForEach-Object { '- ' + $_ }) -join $nl))

# ----------------------------------------
# 4) Workflow -> script/command references
# ----------------------------------------
$wfRefs = @()
$wfDir = Join-Path $RepoRoot '.github/workflows'
if (Test-Path $wfDir) {
  if ($useRg) {
    $wfRefs += Run-Rg '(?i)\bpwsh\b|\bpowershell\b|\.ps1\b|npm\s+run|npx\s+|gh\s+run|gh\s+pr|vercel\b|supabase\b|python\b|ruff\b' @('.github/workflows/*.yml','.github/workflows/*.yaml')
  } else {
    $wfRefs += Run-SelectString '(?i)\bpwsh\b|\bpowershell\b|\.ps1\b|npm\s+run|npx\s+|gh\s+run|gh\s+pr|vercel\b|supabase\b|python\b|ruff\b' @('*.yml','*.yaml')
  }
}
$wfRefs = $wfRefs | Sort-Object -Unique
Write-File 'WORKFLOW.refs.md' (('# Workflow References (commands/scripts)' + $nl + $nl + 'Generated: ' + $now + $nl + 'Engine: ' + $engine + $nl + $nl) + (($wfRefs | ForEach-Object { '- ' + $_ }) -join $nl))

# ----------------------------------------
# 5) Master CALLMAP.md (entry point)
# ----------------------------------------
$call = New-Object System.Collections.Generic.List[string]
$null = $call.Add('# Mishti AI Repo CallMap')
$null = $call.Add('')
$null = $call.Add('Generated: ' + $now)
$null = $call.Add('Branch: ' + $branch)
$null = $call.Add('HEAD: ' + $head)
$null = $call.Add('Engine: ' + $engine)
$null = $call.Add('')
$null = $call.Add('## Outputs')
$null = $call.Add('- docs/_repo_index/CALLMAP.md')
$null = $call.Add('- docs/_repo_index/WORKFLOW.refs.md')
$null = $call.Add('- docs/_repo_index/PS.calls.md')
$null = $call.Add('- docs/_repo_index/TS.exports.md')
$null = $call.Add('- docs/_repo_index/TS.imports.md')
$null = $call.Add('- docs/_repo_index/NEXT.routes.md')
$null = $call.Add('')
$null = $call.Add('## What this gives you')
$null = $call.Add('- A searchable index of workflows, scripts, TS imports/exports, and Next routes.')
$null = $call.Add('- Use it to answer: where is X defined, and where is it referenced.')
$null = $call.Add('')
$null = $call.Add('## Next upgrade (optional)')
$null = $call.Add('- Build a function-level call graph for TS/PS and a per-route dependency list.')
$null = $call.Add('')

Write-File 'CALLMAP.md' ($call -join $nl)

Write-Host '[OK] Repo callmap generated under docs/_repo_index' -ForegroundColor Green

