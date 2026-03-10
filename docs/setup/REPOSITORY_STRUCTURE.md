# Repository Structure

## Top-Level Structure
- apps: end-user and operator products
- packages: shared platform modules
- docs: structured documentation
- scripts: automation entry points
- tools: utilities
- tests: validation assets

## Naming Conventions
- Platform: Mishti AI
- Chat product: Yukti Chat
- IDE product: Yukti IDE
- CLI prefix: mt

## CLI Entry Points
- Preferred CLI wrapper: `scripts/mt.ps1`
- Preferred health wrapper: `scripts/mt_health.ps1`
- Legacy compatibility aliases remain available during the phased migration

## Developer Guidance
Keep product concerns, runtime concerns, governance concerns, and shared packages clearly separated.
