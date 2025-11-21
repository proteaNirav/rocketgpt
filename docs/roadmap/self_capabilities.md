## Self-* Capabilities (Study, Reasoning, Research, Innovation)

### Goals
- Enable RocketGPT to understand its own codebase, docs, and workflows (Self-Study).
- Enable RocketGPT to plan and execute complex tasks in steps (Self-Reasoning).
- Enable RocketGPT to investigate problems and patterns (Self-Research).
- Enable RocketGPT to propose and prototype new ideas/features (Self-Innovation).
- Keep all self-* activity safe, logged, and always under human approval.

### Phase S1 – Foundations (v4.x, Go-Live Compatible)
- Policy/config files:
  - config/self_study_plan.json
  - config/self_reasoning_policy.json
  - config/self_research_policy.json
  - config/self_innovate_policy.json
- Data directories:
  - data/self_study/, data/self_reasoning/, data/self_research/, data/self_innovate/
- GitHub Actions in passive mode:
  - .github/workflows/self_study.yml
  - .github/workflows/self_reasoning.yml
  - .github/workflows/self_research.yml
  - .github/workflows/self_innovate.yml
- Behaviour:
  - Collect signals, generate summaries, produce reports/notes.
  - No code edits, no auto-PRs, no experiments.

### Phase S2 – Guided Autonomy (v5.x)
- Self-Study outputs guide Self-Improve and Self-Heal.
- Self-Reasoning builds task plans for complex fixes and refactors.
- Self-Research:
  - Searches the repo, docs, and past PRs for similar patterns.
  - Proposes candidate solutions in issues/PR descriptions.
- Self-Innovation:
  - Populates idea_pool.jsonl with scored ideas.
  - May open small, low-risk draft PRs (docs, runbooks, minor UX tweaks).
- All changes under strict human approval.

### Phase S3 – Evolving Intelligence (v6+)
- Aggregate learnings into heuristics files (patterns that work well).
- Use Self-Research and Self-Innovation to:
  - Suggest new components, runbooks, and workflows.
  - Periodically run “study sprints” on themes (performance, security, UX).
- No direct merges; infra and core logic changes always require explicit human approval.
