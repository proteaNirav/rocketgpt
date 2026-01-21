$ErrorActionPreference="Stop"
Set-StrictMode -Version Latest

$repoRoot="D:\Projects\RocketGPT\rocketgpt"
Set-Location $repoRoot

$f = Join-Path $repoRoot ".github\workflows\auto_fix_policy_update.yml"
if (-not (Test-Path -LiteralPath $f)) { throw "Missing file: $f" }

$lines = Get-Content -LiteralPath $f

# If GH_TOKEN already exists anywhere, do nothing.
$hasToken = $lines | Where-Object { $_ -match '^\s*GH_TOKEN:\s*\$\{\{\s*(secrets\.GH_PAT|github\.token)\s*\}\}\s*$' }
if ($hasToken) {
  Write-Host "GH_TOKEN already present. No patch needed." -ForegroundColor Yellow
  exit 0
}

# Locate the job block: jobs -> auto_update:
$autoIdx = -1
for ($i=0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match '^\s*auto_update:\s*$') { $autoIdx = $i; break }
}
if ($autoIdx -lt 0) { throw "Could not find 'auto_update:' job in $f" }

# Determine indentation for auto_update job line
$autoIndent = ($lines[$autoIdx] -replace '(^\s*).*','$1').Length
$propIndent = $autoIndent + 2
$envIndent  = $propIndent
$valIndent  = $propIndent + 2

# Find runs-on: ubuntu-latest within that job block
$runsOnIdx = -1
for ($i=$autoIdx+1; $i -lt $lines.Count; $i++) {
  $indent = ($lines[$i] -replace '(^\s*).*','$1').Length

  # Stop if we hit next job at same indent (e.g., another job:)
  if ($indent -le $autoIndent -and $lines[$i] -match '^\s*\w[\w-]*:\s*$') { break }

  if ($lines[$i] -match '^\s*runs-on:\s*ubuntu-latest\s*$') { $runsOnIdx = $i; break }
}
if ($runsOnIdx -lt 0) { throw "Could not find 'runs-on: ubuntu-latest' under auto_update job." }

$envLine   = (" " * $envIndent) + "env:"
$tokenLine = (" " * $valIndent) + "GH_TOKEN: ${{ github.token }}"

# Insert env block immediately after runs-on line
$before = $lines[0..$runsOnIdx]
$after  = @()
if ($runsOnIdx + 1 -lt $lines.Count) { $after = $lines[($runsOnIdx+1)..($lines.Count-1)] }

$newLines = @()
$newLines += $before
$newLines += $envLine
$newLines += $tokenLine
$newLines += $after

Set-Content -LiteralPath $f -Value $newLines -Encoding utf8
Write-Host "Patched: added job-level env.GH_TOKEN = ${{ github.token }}" -ForegroundColor Green
