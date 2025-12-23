# UTF-8 BOM Policy

- Do not commit UTF-8 BOM in YAML/JSON/MD/TS/PS files.
- On Windows PowerShell, `Set-Content -Encoding UTF8` writes BOM.
- Preferred: `[IO.File]::WriteAllText(path, text, (New-Object System.Text.UTF8Encoding($false)))`

Check:
- Run: `pwsh .github/tools/ci/detect-bom.ps1`
