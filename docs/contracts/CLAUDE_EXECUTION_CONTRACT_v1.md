Contract Content (Mandatory Sections)

The document must include these sections in order:

Purpose & Authority

Execution Boundaries

Allowed Actions

Forbidden Actions

Input Contract (What Claude Receives)

Output Contract (What Claude Must Return)

Failure & Rollback Rules

Evidence & Audit Requirements

Versioning & Supersession Rules

No additional sections unless explicitly approved.

Acceptance Checklist (Non-Negotiable)

 File exists at the exact path

 Language is unambiguous (no “may”, “should”, “best effort”)

 Explicit read-only + diff-only guarantees stated

 Rollback rule clearly defined

 Version tagged as v1.0

 No references to tools outside RocketGPT

Execution Instruction (What you do now)

Use Claude Local App and give it ONLY the following high-level instruction:

“Create docs/contracts/CLAUDE_EXECUTION_CONTRACT_v1.md for RocketGPT Phase S2.
Follow the provided scope and mandatory sections exactly.
Do not reference external tools.
Output only the final markdown file content.”

After Claude finishes:

Do not edit manually

Share the diff or full file content here

Pause Point (Important)

I will review and approve Task 1 before we move to Task 2.