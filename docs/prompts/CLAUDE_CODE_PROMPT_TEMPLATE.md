# Claude Code Task Prompt Template

Copy/paste into Claude Code.

---

You are Claude Code working in a LOCAL repo. Follow the repository instructions in CLAUDE.md strictly.

MODE: IMPLEMENTER (write-enabled locally)

TASK:
<Describe the task clearly>

REPO CONTEXT:
- Branch: <your branch>
- Tech: Next.js + TypeScript + Playwright + GitHub Actions + PowerShell tooling
- Constraints: minimal diffs, follow conventions, no unrelated refactors

ACCEPTANCE CRITERIA:
- <criterion 1>
- <criterion 2>

ALLOWED FILE PATHS:
- <path 1>
- <path 2>

COMMANDS TO RUN:
- <command 1>
- <command 2>

STOP CONDITIONS:
- If you need additional files: STOP and request approval listing exact paths
- If tests fail unexpectedly: STOP and report failure summary + suspected cause
