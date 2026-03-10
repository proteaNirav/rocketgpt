# CLI Migration Guide

## Preferred CLI Prefix

Use `mt` as the preferred CLI prefix for Mishti AI operator and developer workflows.

## Compatibility Policy

Legacy CLI aliases remain available during the controlled migration.

- Preferred entry point: `./scripts/mt.ps1`
- Preferred health entry point: `./scripts/mt_health.ps1`
- Legacy compatibility aliases remain supported for existing automation and operator workflows

## Recommended Usage

```powershell
./scripts/mt.ps1 help
./scripts/mt.ps1 health
./scripts/mt.ps1 runs --limit 10
./scripts/mt.ps1 logs --last-failed
./scripts/mt.ps1 deploy --wait
```

Legacy `rgpt` commands are still supported where existing automation, operator habits, or documentation depend on them.

## Migration Notes

- New docs and examples should prefer `mt` where wrapper support exists.
- Internal technical identifiers such as `RGPT_*`, `src/rgpt`, ledger keys, runtime keys, and compatibility paths remain in place until a later validated phase.
- This phase changes the operator-facing command surface only. It does not rename package names, import paths, or contract-sensitive identifiers.
