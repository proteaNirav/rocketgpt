#Requires -Version 5.1
<#
.SYNOPSIS
  Removes UTF-8 BOM from text files in a git repository.
.DESCRIPTION
  Scans for BOM (0xEF 0xBB 0xBF) in text files and removes it safely.
  Only processes files tracked by git (respects .gitignore; avoids node_modules/.git).
#>

[CmdletBinding(SupportsShouldProcess)]
param(
  [string]$Path = (Get-Location).Path,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# Extensions to process (lowercase, with dot)
$TextExtensions = @(
  '.json', '.jsonl', '.yaml', '.yml', '.ts', '.tsx', '.js', '.jsx',
  '.mjs', '.cjs', '.md', '.mdx', '.css', '.scss', '.html', '.xml',
  '.svg', '.toml', '.ini', '.env', '.sh', '.bash', '.ps1', '.cmd',
  '.bat', '.txt', '.gitignore', '.gitattributes', '.editorconfig',
  '.prettierrc', '.eslintrc', '.npmrc', '.nvmrc', '.lock'
)

function Test-HasBOM {
  param([string]$FilePath)
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  if ($bytes.Length -lt 3) { return $false }
  return ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF)
}

function Remove-BOMFromFile {
  param([string]$FilePath)
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  if ($bytes.Length -le 3) {
    # File is only BOM or too small; write empty
    [System.IO.File]::WriteAllBytes($FilePath, [byte[]]@())
    return
  }
  $newBytes = $bytes[3..($bytes.Length - 1)]
  [System.IO.File]::WriteAllBytes($FilePath, [byte[]]$newBytes)
}

# Get files tracked by git (respects .gitignore, excludes node_modules)
Push-Location $Path
try {
  $gitFiles = git ls-files --cached --others --exclude-standard 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Not a git repository or git not available"
    exit 2
  }
} finally {
  Pop-Location
}

$processed = 0
$found = 0
$errors = @()

foreach ($relativePath in $gitFiles) {
  $fullPath = Join-Path $Path $relativePath

  # Skip if file doesn't exist (deleted but staged)
  if (-not (Test-Path $fullPath -PathType Leaf)) { continue }

  $ext = [System.IO.Path]::GetExtension($relativePath).ToLower()
  $fileName = [System.IO.Path]::GetFileName($relativePath).ToLower()

  $isTextFile =
    ($TextExtensions -contains $ext) -or
    ($fileName -in @('.gitignore', '.gitattributes', '.editorconfig', '.npmrc', '.nvmrc'))

  if (-not $isTextFile) { continue }

  $processed++

  try {
    if (Test-HasBOM -FilePath $fullPath) {
      $found++
      if ($DryRun -or $WhatIfPreference) {
        Write-Host "[BOM]   $relativePath" -ForegroundColor Yellow
      } else {
        Remove-BOMFromFile -FilePath $fullPath
        Write-Host "[FIXED] $relativePath" -ForegroundColor Green
      }
    }
  } catch {
    $errors += "$relativePath : $($_.Exception.Message)"
  }
}

Write-Host ""
Write-Host ("Scanned:  {0} files" -f $processed)
$color = if ($found -gt 0) { "Yellow" } else { "Green" }
Write-Host ("BOM hit:  {0} files" -f $found) -ForegroundColor $color

if ($errors.Count -gt 0) {
  Write-Host ("Errors:   {0}" -f $errors.Count) -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}

if ($DryRun -and $found -gt 0) {
  Write-Host ""
  Write-Host "Run without -DryRun to apply fixes." -ForegroundColor Cyan
  exit 1
}

exit 0


