# Migration Notes - RocketGPT to Mishti AI

## What Was Renamed
Repository-facing platform branding has been shifted toward Mishti AI, with Yukti Chat and Yukti IDE introduced as product names.

## Compatibility Considerations
Some deep technical identifiers may need staged migration to avoid breaking builds, imports, or historical references.

## What Was Intentionally Preserved
Legacy low-level identifiers may remain temporarily where direct replacement is high risk. This repair pass intentionally leaves the following in place until a controlled compatibility migration is validated:

- `RGPT_*` environment variables and runtime keys
- `src/rgpt` and other repo-internal technical namespaces
- legacy governance filenames and historical evidence artifacts
- repo-local compatibility paths such as `.rocketgpt/*`

## Follow-Up Actions Recommended
- Review package names
- Review import paths
- Review workflow display names
- Review storage keys and environment variables
- Complete repo-specific physical renames
