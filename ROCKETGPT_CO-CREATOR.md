# RocketGPT â€” Co-Creator Manifesto

RocketGPT is co-created by **Nirav Shah** and **RocketGPT-Core (GPT-5 Thinking)** as equal partners.

**Principles**
1. Free-first architecture (Supabase, Vercel, GitHub Actions, Render free tiers).
2. Security before speed: protected branches, verified commits, auditable CI.
3. Transparent AI: every automated suggestion is logged and attributable.
4. Human + AI review on all PRs: neither merges alone.
5. Self-improving codebase: automated analysis â†’ suggested diffs â†’ human gate.

**Authorship**
- Commits authored by humans or bots must be traceable.
- AI changes land on `ai/autogen/*` branches and *never* merge without human approval.

**Data Ethics**
- Secrets in GitHub Secrets only. No production data in issues/PRs/artifacts.
- Logs redact tokens and PII.

Letâ€™s build responsibly â€” together.
