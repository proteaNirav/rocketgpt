# Claude Review Checklist (RGPT-S2-B-07)

This checklist is designed to validate Claude's execution
**quickly, safely, and deterministically**.

Target review time: **10–15 minutes**

---

## 1. Scope Validation (MANDATORY)

- [ ] All files created/modified are explicitly listed
- [ ] No files outside stated scope are touched
- [ ] No security, approval, or policy-gate logic changed
- [ ] No CI/CD workflows added or altered unintentionally

If ANY item fails → **REJECT**

---

## 2. Contract Compliance

- [ ] Follows CLAUDE_EXECUTION_CONTRACT.md
- [ ] No forbidden actions detected
- [ ] No implicit assumptions hidden in implementation

---

## 3. Artifact Quality

For EACH artifact:
- [ ] Purpose clearly stated
- [ ] Assumptions listed
- [ ] Verification status mentioned
- [ ] Clean structure and naming

---

## 4. Evidence Verification

- [ ] Evidence files exist under docs/ops/
- [ ] Evidence is human-readable
- [ ] Evidence matches actual work done
- [ ] No missing mandatory evidence

---

## 5. Risk & Drift Check

- [ ] No architectural drift introduced
- [ ] No refactor disguised as cleanup
- [ ] Known risks explicitly documented
- [ ] Deferred items clearly marked

---

## 6. Merge Readiness Decision

Choose ONE:

- [ ] ACCEPT — Safe to merge
- [ ] ACCEPT WITH NOTES — Minor issues, non-blocking
- [ ] REJECT — Violates contract or scope

---

## 7. Reviewer Notes

(Record any observations, concerns, or follow-ups here.)

---

## 8. Review Metadata

- Reviewer:
- Date:
- Phase: RGPT-S2-B-07
- Decision:
