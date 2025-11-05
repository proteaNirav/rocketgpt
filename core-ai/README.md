# RocketGPT v4 â€” Core AI (Self-Healing & Self-Improving)

This branch seeds the **Self-Heal Controller** workflow and a core-ai/ workspace for future agents:
- Diagnostics & plan generation
- Safe patch PRs with guardrails
- Auto-verification & rollback hooks

Next:
1. Extend \.github/workflows/self_heal.yml\ to listen to your CI failures.
2. Add agent code in \core-ai/\ (TypeScript/Python) that:
   - Parses failing logs
   - Suggests patch diffs
   - Opens PRs with tests
3. Wire safety locks: codeowners, mandatory checks, limited write scopes.
