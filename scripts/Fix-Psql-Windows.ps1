<#
.SYNOPSIS
    Diagnose and fix Windows psql issues for Mishti AI.

.DESCRIPTION
    On Windows, 'psql' may resolve to a wrong executable (alias, different tool).
    This script:
      1. Prints diagnostics (Get-Command, where.exe, --version, -?)
      2. Detects if psql is NOT the PostgreSQL client
      3. Offers two fix paths:
         A) Detect PostgreSQL installer path and prepend to PATH
         B) Install PostgreSQL client via Chocolatey (if available)
      4. Validates with a test query

.PARAMETER TestHost
    PostgreSQL host for validation (default: localhost)

.PARAMETER TestPort
    PostgreSQL port for validation (default: 5432)

.PARAMETER TestDatabase
    Database name for validation (default: postgres)

.PARAMETER TestUser
    Username for validation (default: postgres)

.PARAMETER FixMode
    Auto-fix mode: 'None', 'PostgresPath', 'Choco' (default: None = diagnose only)

.PARAMETER SkipValidation
    Skip the connection validation step

.EXAMPLE
    .\Fix-Psql-Windows.ps1
    # Diagnose only

.EXAMPLE
    .\Fix-Psql-Windows.ps1 -FixMode PostgresPath
    # Attempt to fix PATH using detected PostgreSQL installation

.EXAMPLE
    $env:PGPASSWORD = "secret"; .\Fix-Psql-Windows.ps1 -TestHost db.example.com -TestPort 5432 -TestUser myuser -TestDatabase mydb
    # Diagnose and validate connection (password via env var, never printed)

.NOTES
    SECURITY: This script NEVER prints passwords or secrets.
    Use PGPASSWORD environment variable for authentication.
#>

[CmdletBinding()]
param(
    [string]$TestHost = "localhost",
    [int]$TestPort = 5432,
    [string]$TestDatabase = "postgres",
    [string]$TestUser = "postgres",
    [ValidateSet("None", "PostgresPath", "Choco")]
    [string]$FixMode = "None",
    [switch]$SkipValidation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -----------------------------------------------------------------------------
# Helper: Write colored output
# -----------------------------------------------------------------------------
function Write-Section([string]$Title) {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Warn([string]$Message) {
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Err([string]$Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Info([string]$Message) {
    Write-Host "[INFO] $Message" -ForegroundColor Gray
}

# -----------------------------------------------------------------------------
# 1. DIAGNOSTICS
# -----------------------------------------------------------------------------
Write-Section "psql Diagnostics"

# 1a. Check PowerShell aliases
Write-Host "`n>> Checking PowerShell aliases for 'psql'..." -ForegroundColor White
$alias = Get-Alias -Name psql -ErrorAction SilentlyContinue
if ($alias) {
    Write-Warn "PowerShell alias found: psql -> $($alias.Definition)"
    Write-Info "This alias may intercept the real psql executable."
} else {
    Write-Ok "No PowerShell alias for 'psql'"
}

# 1b. Get-Command psql
Write-Host "`n>> Get-Command psql..." -ForegroundColor White
$gcm = Get-Command psql -ErrorAction SilentlyContinue
if ($gcm) {
    Write-Host "  CommandType : $($gcm.CommandType)"
    Write-Host "  Name        : $($gcm.Name)"
    Write-Host "  Source      : $($gcm.Source)"
    if ($gcm.Source) {
        $psqlPath = $gcm.Source
    } else {
        $psqlPath = $null
    }
} else {
    Write-Err "'psql' not found via Get-Command"
    $psqlPath = $null
}

# 1c. where.exe psql (shows ALL matches in PATH)
Write-Host "`n>> where.exe psql (all PATH matches)..." -ForegroundColor White
$whereResults = $null
try {
    $whereResults = & where.exe psql 2>$null
    if ($whereResults) {
        $whereResults | ForEach-Object { Write-Host "  $_" }
        $allPsqlPaths = @($whereResults)
    } else {
        Write-Warn "where.exe found no 'psql' in PATH"
        $allPsqlPaths = @()
    }
} catch {
    Write-Warn "where.exe failed: $_"
    $allPsqlPaths = @()
}

# 1d. psql --version
Write-Host "`n>> psql --version..." -ForegroundColor White
$versionOutput = $null
$isPostgresClient = $false
try {
    $versionOutput = & psql --version 2>&1
    Write-Host "  $versionOutput"

    # PostgreSQL psql outputs: "psql (PostgreSQL) X.Y.Z"
    if ($versionOutput -match "PostgreSQL") {
        Write-Ok "Version string contains 'PostgreSQL' - likely correct binary"
        $isPostgresClient = $true
    } else {
        Write-Warn "Version string does NOT contain 'PostgreSQL' - WRONG BINARY?"
    }
} catch {
    Write-Err "psql --version failed: $_"
}

# 1e. psql -? (help) - PostgreSQL psql has specific flags
Write-Host "`n>> psql -? (checking help flags)..." -ForegroundColor White
$helpOutput = $null
try {
    $helpOutput = & psql -? 2>&1 | Out-String

    # PostgreSQL psql help contains specific flags like -U, -d, -h, -p
    $hasUFlag = $helpOutput -match "-U.*username"
    $hasDFlag = $helpOutput -match "-d.*dbname"
    $hasHFlag = $helpOutput -match "-h.*hostname"
    $hasPFlag = $helpOutput -match "-p.*port"

    if ($hasUFlag -and $hasDFlag -and $hasHFlag -and $hasPFlag) {
        Write-Ok "Help output contains PostgreSQL-specific flags (-U, -d, -h, -p)"
        $isPostgresClient = $true
    } else {
        Write-Warn "Help output MISSING expected PostgreSQL flags"
        Write-Info "This indicates psql is NOT the PostgreSQL client!"
        $isPostgresClient = $false

        # Show first 20 lines of help for diagnosis
        Write-Host "`n  -- First 20 lines of help output --" -ForegroundColor DarkGray
        $helpOutput -split "`n" | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }
} catch {
    Write-Err "psql -? failed: $_"
}

# -----------------------------------------------------------------------------
# 2. DETECTION SUMMARY
# -----------------------------------------------------------------------------
Write-Section "Detection Summary"

if ($isPostgresClient) {
    Write-Ok "psql appears to be the correct PostgreSQL client"
    if ($psqlPath) {
        Write-Info "Location: $psqlPath"
    }
} else {
    Write-Err "psql is NOT the PostgreSQL client or is missing!"
    Write-Host ""
    Write-Host "Common causes:" -ForegroundColor Yellow
    Write-Host "  1. Another 'psql' executable (MySQL, etc.) is higher in PATH"
    Write-Host "  2. PostgreSQL client tools are not installed"
    Write-Host "  3. PostgreSQL bin directory is not in PATH"
    Write-Host ""
}

# -----------------------------------------------------------------------------
# 3. FIND POSTGRESQL INSTALLATION
# -----------------------------------------------------------------------------
Write-Section "Searching for PostgreSQL Installation"

$pgBinPaths = @()

# Check common PostgreSQL installation paths
$searchPaths = @(
    "C:\Program Files\PostgreSQL\*\bin",
    "C:\Program Files (x86)\PostgreSQL\*\bin",
    "$env:ProgramFiles\PostgreSQL\*\bin",
    "${env:ProgramFiles(x86)}\PostgreSQL\*\bin",
    "C:\PostgreSQL\*\bin",
    "C:\Tools\Postgres\*\bin",
    "C:\Tools\PostgreSQL\*\bin"
)

# Also check if current psql is valid, add its parent dir directly
if ($psqlPath -and (Test-Path $psqlPath)) {
    $currentBin = Split-Path $psqlPath -Parent
    if ($currentBin -and (Test-Path (Join-Path $currentBin "psql.exe"))) {
        if ($pgBinPaths -notcontains $currentBin) {
            $pgBinPaths += $currentBin
            Write-Info "Found PostgreSQL bin (current): $currentBin"
        }
    }
}

foreach ($pattern in $searchPaths) {
    $matches = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer }
    foreach ($dir in $matches) {
        $psqlExe = Join-Path $dir.FullName "psql.exe"
        if (Test-Path $psqlExe) {
            if ($pgBinPaths -notcontains $dir.FullName) {
                $pgBinPaths += $dir.FullName
                Write-Info "Found PostgreSQL bin: $($dir.FullName)"
            }
        }
    }
}

# Also check via registry
try {
    $regPaths = @(
        "HKLM:\SOFTWARE\PostgreSQL\Installations",
        "HKLM:\SOFTWARE\WOW6432Node\PostgreSQL\Installations"
    )
    foreach ($regPath in $regPaths) {
        if (Test-Path $regPath) {
            Get-ChildItem $regPath -ErrorAction SilentlyContinue | ForEach-Object {
                $baseDir = (Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue)."Base Directory"
                if ($baseDir) {
                    $binDir = Join-Path $baseDir "bin"
                    $psqlExe = Join-Path $binDir "psql.exe"
                    if ((Test-Path $psqlExe) -and ($pgBinPaths -notcontains $binDir)) {
                        $pgBinPaths += $binDir
                        Write-Info "Found PostgreSQL bin (registry): $binDir"
                    }
                }
            }
        }
    }
} catch {
    Write-Info "Registry search skipped: $_"
}

# Sort by version (newest first, assuming version in path like PostgreSQL\16\bin)
# Ensure result is always an array (Sort-Object returns $null for empty input)
$pgBinPaths = @($pgBinPaths | Sort-Object -Descending)

if ($pgBinPaths.Count -eq 0) {
    Write-Warn "No PostgreSQL installation found on this system"
} else {
    Write-Ok "Found $($pgBinPaths.Count) PostgreSQL installation(s)"
    $pgBinPaths | ForEach-Object { Write-Host "  - $_" }
}

# Check Chocolatey
Write-Host "`n>> Checking for Chocolatey..." -ForegroundColor White
$chocoAvailable = $null -ne (Get-Command choco -ErrorAction SilentlyContinue)
if ($chocoAvailable) {
    Write-Ok "Chocolatey is available"
} else {
    Write-Info "Chocolatey is not installed"
}

# -----------------------------------------------------------------------------
# 4. FIX OPTIONS
# -----------------------------------------------------------------------------
Write-Section "Fix Options"

if ($isPostgresClient) {
    Write-Ok "No fix needed - psql is working correctly"
} else {
    Write-Host "Available fix options:" -ForegroundColor White
    Write-Host ""

    if ($pgBinPaths.Count -gt 0) {
        Write-Host "  [A] PostgresPath - Prepend PostgreSQL bin to PATH" -ForegroundColor Green
        Write-Host "      Recommended path: $($pgBinPaths[0])"
        Write-Host "      Run: .\Fix-Psql-Windows.ps1 -FixMode PostgresPath"
        Write-Host ""
    }

    if ($chocoAvailable) {
        Write-Host "  [B] Choco - Install PostgreSQL client via Chocolatey" -ForegroundColor Green
        Write-Host "      Run: .\Fix-Psql-Windows.ps1 -FixMode Choco"
        Write-Host ""
    } elseif ($pgBinPaths.Count -eq 0) {
        Write-Host "  [B] Install Chocolatey first, then use -FixMode Choco" -ForegroundColor Yellow
        Write-Host "      Or download PostgreSQL from: https://www.postgresql.org/download/windows/"
        Write-Host ""
    }

    if ($pgBinPaths.Count -eq 0 -and -not $chocoAvailable) {
        Write-Host "  [Manual] Download PostgreSQL installer from:" -ForegroundColor Yellow
        Write-Host "           https://www.postgresql.org/download/windows/"
        Write-Host ""
    }
}

# -----------------------------------------------------------------------------
# 5. APPLY FIX (if requested)
# -----------------------------------------------------------------------------
if ($FixMode -ne "None") {
    Write-Section "Applying Fix: $FixMode"

    switch ($FixMode) {
        "PostgresPath" {
            if ($pgBinPaths.Count -eq 0) {
                Write-Err "Cannot apply PostgresPath fix - no PostgreSQL installation found"
                Write-Host "Install PostgreSQL first or use -FixMode Choco"
                exit 1
            }

            $targetBin = $pgBinPaths[0]
            Write-Info "Prepending to PATH: $targetBin"

            # Prepend to current session PATH
            $env:PATH = "$targetBin;$env:PATH"
            Write-Ok "PATH updated for current session"

            # Instructions for permanent fix
            Write-Host ""
            Write-Host "To make this permanent, run (as Administrator):" -ForegroundColor Yellow
            Write-Host @"
  `$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'Machine')
  if (`$currentPath -notlike "*$targetBin*") {
      [Environment]::SetEnvironmentVariable('PATH', "$targetBin;`$currentPath", 'Machine')
  }
"@ -ForegroundColor DarkGray
            Write-Host ""
        }

        "Choco" {
            if (-not $chocoAvailable) {
                Write-Err "Chocolatey is not installed"
                Write-Host "Install Chocolatey from: https://chocolatey.org/install"
                exit 1
            }

            Write-Info "Installing postgresql via Chocolatey (requires elevation)..."
            Write-Host "Running: choco install postgresql --confirm" -ForegroundColor DarkGray

            try {
                # Check if running elevated
                $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

                if (-not $isAdmin) {
                    Write-Warn "Not running as Administrator - Chocolatey install may fail"
                    Write-Host "Re-run this script as Administrator, or run manually:" -ForegroundColor Yellow
                    Write-Host "  choco install postgresql --confirm" -ForegroundColor DarkGray
                } else {
                    & choco install postgresql --confirm
                    if ($LASTEXITCODE -eq 0) {
                        Write-Ok "PostgreSQL installed via Chocolatey"
                        Write-Warn "You may need to restart your terminal for PATH changes to take effect"

                        # Try to find the new installation
                        $newPaths = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin" -ErrorAction SilentlyContinue
                        if ($newPaths) {
                            $latestBin = ($newPaths | Sort-Object -Descending | Select-Object -First 1).FullName
                            $env:PATH = "$latestBin;$env:PATH"
                            Write-Ok "PATH updated for current session: $latestBin"
                        }
                    } else {
                        Write-Err "Chocolatey install failed with exit code $LASTEXITCODE"
                        exit 1
                    }
                }
            } catch {
                Write-Err "Chocolatey install failed: $_"
                exit 1
            }
        }
    }
}

# -----------------------------------------------------------------------------
# 6. VALIDATION
# -----------------------------------------------------------------------------
if (-not $SkipValidation) {
    Write-Section "Validation"

    # Re-check psql after potential fix
    Write-Host ">> Re-checking psql..." -ForegroundColor White
    $gcmAfter = Get-Command psql -ErrorAction SilentlyContinue
    if ($gcmAfter) {
        Write-Info "psql location: $($gcmAfter.Source)"

        $versionAfter = & psql --version 2>&1
        Write-Info "psql version: $versionAfter"

        if ($versionAfter -match "PostgreSQL") {
            Write-Ok "psql is now the PostgreSQL client"
        } else {
            Write-Err "psql is still NOT the PostgreSQL client"
            exit 1
        }
    } else {
        Write-Err "psql still not found"
        exit 1
    }

    # Test connection (only if PGPASSWORD is set or localhost)
    Write-Host "`n>> Testing connection..." -ForegroundColor White

    if (-not $env:PGPASSWORD -and $TestHost -ne "localhost" -and $TestHost -ne "127.0.0.1") {
        Write-Warn "PGPASSWORD not set - skipping remote connection test"
        Write-Info "To test: `$env:PGPASSWORD = 'yourpassword'; .\Fix-Psql-Windows.ps1"
    } else {
        Write-Info "Connecting to $TestHost`:$TestPort as $TestUser..."
        Write-Host "(Password passed via PGPASSWORD env var - not printed)" -ForegroundColor DarkGray

        try {
            $testResult = & psql -h $TestHost -p $TestPort -d $TestDatabase -U $TestUser -w -c "SELECT 1 AS connection_test;" 2>&1

            if ($LASTEXITCODE -eq 0 -and $testResult -match "connection_test") {
                Write-Ok "Connection test PASSED"
                Write-Host $testResult -ForegroundColor DarkGray
            } else {
                Write-Warn "Connection test returned exit code $LASTEXITCODE"
                Write-Host $testResult -ForegroundColor DarkGray

                if ($testResult -match "password authentication failed" -or $testResult -match "no password supplied") {
                    Write-Info "Set PGPASSWORD environment variable with correct password"
                } elseif ($testResult -match "could not connect") {
                    Write-Info "Check host, port, and network connectivity"
                }
            }
        } catch {
            Write-Err "Connection test failed: $_"
        }
    }
}

# -----------------------------------------------------------------------------
# 7. SUMMARY
# -----------------------------------------------------------------------------
Write-Section "Summary"

$gcmFinal = Get-Command psql -ErrorAction SilentlyContinue
if ($gcmFinal -and (& psql --version 2>&1) -match "PostgreSQL") {
    Write-Ok "psql is correctly configured"
    Write-Host "  Location: $($gcmFinal.Source)"
    Write-Host "  Version:  $(& psql --version 2>&1)"
    exit 0
} else {
    Write-Err "psql is NOT correctly configured"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    if ($pgBinPaths.Count -gt 0) {
        Write-Host "  1. Run: .\Fix-Psql-Windows.ps1 -FixMode PostgresPath"
    } elseif ($chocoAvailable) {
        Write-Host "  1. Run (as Admin): .\Fix-Psql-Windows.ps1 -FixMode Choco"
    } else {
        Write-Host "  1. Install PostgreSQL from https://www.postgresql.org/download/windows/"
        Write-Host "  2. Re-run this script"
    }
    exit 1
}
