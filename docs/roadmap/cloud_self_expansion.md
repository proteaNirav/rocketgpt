## Cloud Self-Expansion & Federated Free-Tier Architecture

### Goals
- Detect when any free-tier resource (DB, storage, bandwidth, actions) is nearing limits.
- Evaluate alternative free-tier providers and architectures.
- Generate migration strategies and infra PRs under human approval.
- Keep RocketGPT sustainable on free/low-cost infra for as long as possible.

### Phase C1 – Foundations (v4.x)
- config/infra_strategy_policy.json with thresholds, risk rules, and provider allowlist.
- GitHub Action workflow .github/workflows/self_infra_evolve.yml in "analysis-only" mode:
  - Detect approaching limits (based on policy thresholds).
  - Generate a Cloud Strategy Report into docs/infra/.
  - Open/refresh an issue labelled cloud-self-expansion.

### Phase C2 – Guided Evolution (v5.x)
- Extend self_infra_evolve to:
  - Propose 2–3 federation options (e.g. move logs to GitHub artifacts, cold data to object storage).
  - Generate infra PRs targeting non-critical paths first.
  - Add validation jobs to test new infra in a sandbox environment.
- All PRs require human review and cannot auto-merge.

### Phase C3 – Federated Architecture (v6+)
- Support multi-provider architectures:
  - Core DB + auth on primary Postgres provider.
  - Cold storage/logs on secondary object storage provider.
  - CI-driven analysis and infra suggestions for cost/performance optimization.
- Maintain docs/infra/federated_architecture.md as a living document auto-updated via self_infra_evolve.
- Infra migrations remain strictly human-approved.
