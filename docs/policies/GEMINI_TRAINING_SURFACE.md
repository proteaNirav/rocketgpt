\# Gemini Training Surface Policy for RocketGPT



\## 1. Purpose



This document defines \*\*where Gemini or any external LLM may be used to “train” or improve RocketGPT at a design/documentation level\*\*, and \*\*where it is NOT allowed to influence the system\*\*.



Runtime behavior, code execution, and self-improvement of RocketGPT remain \*\*strictly driven by OpenAI models (and optionally Claude in future)\*\* plus human review.



Gemini is treated as an \*\*external consultant\*\*: it can suggest ideas and text, but it never directly modifies the codebase or runs inside RocketGPT.



---



\## 2. Allowed: Design-Time Only (Gemini-May-Contribute Area)



The following areas are considered \*\*safe for Gemini-assisted drafting\*\*, as long as:



\- All changes are manually reviewed by a human.

\- Final integration into the repo is done via the normal Git workflow.

\- OpenAI-based assistants are used for the final shaping/validation when needed.



\### 2.1 Prompt \& UX Copy Surfaces



These locations are \*content-oriented\* and safe for Gemini to help propose wording, examples, or tone:



\- `rocketgpt\_v3\_full/webapp/next/app/prompts/data/prompts.data.ts`

&nbsp; - Prompt definitions, examples, helper descriptions.

\- `rocketgpt\_v3\_full/webapp/next/app/page.tsx`

&nbsp; - Landing page copy, tool descriptions, headings, and helper text.

\- `rocketgpt\_v3\_full/webapp/next/components/layout/Topbar.tsx`

\- `rocketgpt\_v3\_full/webapp/next/components/layout/Sidebar.tsx`

&nbsp; - Labels, tooltips, short descriptions.



\### 2.2 Documentation \& Runbooks



\- `docs/runbooks/\*\*/\*.md`

\- `docs/go-live/\*\*/\*.md`

\- `docs/ux/\*\*/\*.md`

\- `docs/roadmap/\*\*/\*.md` (including `AI\_Evolution.md`)

\- `docs/real-self-improving-rocketgpt.md`

\- `PROJECT\_CONTEXT\_FOR\_AI.md` (narrative/description sections)



Gemini may help with:



\- Explaining features

\- Writing onboarding guides

\- Drafting troubleshooting steps

\- Generating examples and scenarios



\### 2.3 Marketing / Help / Narrative Content



\- `README.md` (high-level descriptions and marketing text)

\- Any `/docs/\*\*` pages that describe:

&nbsp; - What RocketGPT does

&nbsp; - How to use it

&nbsp; - Example use cases



---



\## 3. Restricted: OpenAI + Human Review Only (No Gemini Influence)



The following areas are \*\*strictly off-limits for Gemini\*\*. They must be authored and evolved only via:



\- Human developers

\- OpenAI-based assistants (e.g., ChatGPT),

\- And your controlled Git workflow.



\### 3.1 Core Application Code



\- All TypeScript / JavaScript / TSX source code:

&nbsp; - `rocketgpt\_v3\_full/webapp/next/\*\*/\*.ts`

&nbsp; - `rocketgpt\_v3\_full/webapp/next/\*\*/\*.tsx`

\- All backend and service logic if present (API handlers, routers, lib modules).

\- Any custom Node/PNPM scripts related to build or runtime.



\### 3.2 Workflows, Automation \& Self-Improve Logic



\- `.github/workflows/\*\*/\*.yml`

\- `.rgpt/agent/\*\*/\*.json` or `.yml` (if present)

\- Any “Self-Improve”, “Self-Heal”, “Watcher”, “Policy Gate”, “Auto-Merge” logic.

\- `safe\_mode/\*\*`, `text-guard` configs, policy gates, RLS tests, security checks.



These control:



\- Branch protection

\- Auto-fix/auto-PR logic

\- Safety and compliance enforcement



\### 3.3 Database \& Security



\- All SQL files \& migrations:

&nbsp; - `db/\*\*`

&nbsp; - `supabase/\*\*`

&nbsp; - `migrations/\*\*`

\- Any RLS policy definitions, Postgres functions, plpgsql procedures.

\- Any secrets management scripts:

&nbsp; - `.env.example`

&nbsp; - Scripts that touch secrets or environment configuration.



\### 3.4 CI/CD, Deployment \& Infra Glue



\- Deployment scripts (PowerShell, Bash, etc.) for:

&nbsp; - Vercel

&nbsp; - Render

&nbsp; - Railway

&nbsp; - Supabase CLI, etc.

\- Monitoring \& alerting integration scripts.



These must remain tightly controlled to avoid:

\- Breaking production

\- Weakening security



---



\## 4. Grey-Zone Areas (Use Gemini With Extra Care)



Some areas are \*\*mixed\*\*: they contain prompt-like content but directly affect system behavior.



Examples:



\- Agent prompt configurations that dictate:

&nbsp; - Planner behavior

&nbsp; - Codegen constraints

&nbsp; - Safety boundaries

\- Any “rules” that the Neural Orchestrator strictly obeys.



Policy:



1\. Gemini may help you brainstorm wording OFF-REPO.

2\. You must:

&nbsp;  - Review and sanitize the wording.

&nbsp;  - Possibly re-check with OpenAI.

&nbsp;  - Only then integrate into the actual config files.



---



\## 5. Operational Rules



1\. \*\*Gemini is never configured inside RocketGPT\*\*  

&nbsp;  - No `GEMINI\_API\_KEY` or project IDs in `.env`.

&nbsp;  - No Gemini entries in provider routing.



2\. \*\*Gemini is always outside the repo boundary\*\*  

&nbsp;  - Used in browser/IDE as a thinking partner.

&nbsp;  - Content comes in via copy–paste and human judgment.



3\. \*\*RocketGPT runtime = OpenAI only\*\*  

&nbsp;  - All real-time user requests, crawling, planning, building, testing, and self-improvement flows are powered only by OpenAI models (and Claude in future if explicitly added).



---



\## 6. Future Revisions



If, in future, we choose to let Gemini participate more directly, this document MUST be updated first, and changes should be clearly noted in Git history with:



\- Author

\- Date

\- Reason for change

\- Scope of new Gemini capabilities



