# D6 CATS End-to-End Demo Script Handoff (2026-02-26)

## Task
Add `scripts/demo/d6_cats_end_to_end.ps1` to prove end-to-end:
- registry API
- passport/definition fetch
- replay evidence (normal + forced denial)

Branch target: `demo/d5-cats-platform-parity`

## Current Status
- `scripts/demo/d6_cats_end_to_end.ps1` exists and is uncommitted.
- Script includes:
  - params: `-CatId`, `-Port`, `-DenyReason`
  - background API startup with `Start-Process`
  - temp stdout/stderr logs
  - health-check retry loop
  - endpoint fetch/print for registry/passport/definition
  - replay invocation (normal + optional deny)
  - parsing `CATS demo artifact: <path>`
  - final summary with latest artifact + renewal artifact paths
  - top comment usage examples
- `Get-Help` parse check passed.

## Blocking Issue Found
The background `uvicorn` startup path is not reliably loading the intended CATS API app when launched via `Start-Process`.

Observed behavior:
- `uvicorn` starts successfully on `127.0.0.1:8080`
- Health-check requests reach the server
- `/cats/registry` returns `404 Not Found` repeatedly
- This indicates a different `main` module/app is being served (module-name collision / process cwd/import resolution issue)

Notes:
- Direct local check inside `apps/core-api` works:
  - `python -c "from main import app; print([r.path for r in app.routes])"`
  - confirms `/cats/registry` route exists in the intended app

## Last Attempt (Interrupted)
I was in the middle of replacing the `python -c ...` startup with:
- `Start-Process pwsh -NoProfile -Command "Set-Location ...; python -m uvicorn main:app ..."`

Reason:
- More deterministic cwd/import behavior than `Start-Process` -> `python -c ...`
- Easier to debug and aligns with the requirement to use `Start-Process`

The patch was interrupted by the user before it applied.

## Files Changed
- `scripts/demo/d6_cats_end_to_end.ps1` (new, not committed)

## Next Steps To Resume
1. Patch `Ensure-CatsRegistryApi` startup to use:
   - `Start-Process -FilePath "pwsh"`
   - `-ArgumentList @("-NoProfile","-Command","Set-Location ...; python -m uvicorn main:app --host 127.0.0.1 --port <Port>")`
2. Re-run:
   - `pwsh -NoProfile -File .\scripts\demo\d6_cats_end_to_end.ps1`
3. Re-run with denial:
   - `pwsh -NoProfile -File .\scripts\demo\d6_cats_end_to_end.ps1 -DenyReason expired`
4. Confirm final summary prints artifact paths.
5. Commit only the script:
   - `git add scripts/demo/d6_cats_end_to_end.ps1`
   - `git commit -m "demo(d6): add one-command CATS end-to-end demo script (registry + replay evidence)"`
6. Provide user the exact validation commands (normal + deny).

## Useful Debug Artifacts (from failed runs)
Temp logs were written under `%TEMP%`, e.g.:
- `cats_registry_uvicorn_8080_20260226_190711.*`
- `cats_registry_uvicorn_8080_20260226_190959.*`
- `cats_registry_uvicorn_8080_20260226_191219.*`
- `cats_registry_uvicorn_8080_20260226_191419.*`
- `cats_registry_uvicorn_8080_20260226_191749.*`
- `cats_registry_uvicorn_8080_20260226_192000.*`

They show successful uvicorn startup but repeated `GET /cats/registry -> 404`.
