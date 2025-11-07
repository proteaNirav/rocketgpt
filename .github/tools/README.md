# Self-Heal / Self-Improve Tooling (PowerShell)

- `Self-Heal-Improve.ps1`: CI helper (repo-safe variant).
- `Self-Heal-Improve.local.ps1`: local developer helper (no GH writes).
- `install_auto_fix_policy.ps1`: sets up auto-fix policy scaffolding.

> Note: No workflows are modified in this PR. Next PR will wire these tools into CI behind Policy Gate.
# Toggle protection
.\.github\tools\toggle-protection.ps1 show
.\.github\tools\toggle-protection.ps1 dev
.\.github\tools\toggle-protection.ps1 secure -RequiredApprovals 1
