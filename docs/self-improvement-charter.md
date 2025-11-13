\# RocketGPT Self-Improvement Charter (v1)



\## Goals



RocketGPT is allowed to propose and implement changes that:



\- Improve answer quality, safety, and reliability.

\- Improve UX and developer experience (DX) for humans using RocketGPT.

\- Reduce cost by preferring stable free tiers or low-cost plans.

\- Simplify or harden the architecture, CI/CD, and security.



\## Allowed Change Types (Scope v1)



The AI may create PRs that do \*\*any\*\* of the following, as long as tests + policy gate pass:



1\. \*\*Prompt \& Logic Config\*\*

&nbsp;  - Update system prompts, mode descriptions (/fast, /accurate, etc.).

&nbsp;  - Improve tool descriptions and routing logic (without removing safety checks).

&nbsp;  - Add evaluation prompts to test answer quality.



2\. \*\*Docs\*\*

&nbsp;  - Create or update docs under `docs/`:

&nbsp;    - How features work.

&nbsp;    - How workflows and agents work.

&nbsp;    - Free-tier and cost comparison notes.



3\. \*\*UI \& UX\*\*

&nbsp;  - Small, incremental improvements only:

&nbsp;    - Text changes, labels, tooltips.

&nbsp;    - Layout tweaks, new buttons or small panels.

&nbsp;  - Must keep the app buildable and responsive.



4\. \*\*Workflows \& CI (Safe Zone)\*\*

&nbsp;  - Add or improve \*checking\* workflows:

&nbsp;    - More linting, type-checks, tests, actionlint, etc.

&nbsp;  - Add new evaluation jobs (no deployment or secret changes).



5\. \*\*Experiments (behind flags)\*\*

&nbsp;  - Add new features or flows behind explicit feature flags or config keys.

&nbsp;  - Default state should be safe and non-breaking.



\## Forbidden Changes (for AI, v1)



The AI must \*\*not\*\*:



\- Add, remove, or change \*\*secrets\*\*, tokens, or credentials.

\- Disable core security tools:

&nbsp; - Policy Gate, Text-Guard, CodeQL, security-scan, branch protection.

\- Change branch protection or auto-merge rules directly.

\- Introduce new external services that \*\*require paid plans\*\* without human approval.

\- Remove tests or checks just to “make it pass”.



\## Process Requirements



\- All changes must go through \*\*pull requests\*\*.

\- Every PR must:

&nbsp; - Pass lint, typecheck, tests, and workflow validation.

&nbsp; - Pass Policy Gate and security scans.

\- PR description should clearly explain:

&nbsp; - What changed.

&nbsp; - Why it improves RocketGPT.

&nbsp; - Risks and rollback steps.



\## Roadmap for Future Self-Improvement (v2+)



In future versions, RocketGPT may:



\- Analyse chat logs and errors to generate a prioritized improvement backlog.

\- Periodically search for better free tiers and update a `docs/free-tier-matrix.md`.

\- Suggest deeper refactors (modular agents, new tool router, etc.).

\- Co-ordinate multi-step migrations across workflows and services.



These extensions will be added only after v1 is stable.



