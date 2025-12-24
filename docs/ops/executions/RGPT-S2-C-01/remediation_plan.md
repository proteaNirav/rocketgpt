# RGPT-S2-C-01 — Dependabot Remediation Plan

- Commit (snapshot basis): 1b5fcf6bda4b100d8224528a312da32e2fdf5441
- Generated: 2025-12-24 23:08:43 +05:30
- Open alerts: **13**

## Grouping Summary
### By severity
- high: 7
- medium: 3
- low: 3

### By ecosystem
- npm: 13

## Execution Strategy (travel-optimized)
1. Fix **High/Critical** first (prefer lockfile updates).
2. Batch by **ecosystem + manifest path** (reduces CI cycles).
3. After each batch: run tests (unit + Playwright smoke) and push PR.
4. Close with evidence: before/after counts + PR links + CI proof.

## Action Buckets (ordered)

### Severity: high (7)
| # | Ecosystem | Package | Manifest | Summary | Link |
|---:|---|---|---|---|---|
| 1 | npm | glob | .ops/claude/staging/next/package-lock.json | glob CLI: Command injection via -c/--cmd executes matches with shell:true | https://github.com/proteaNirav/rocketgpt/security/dependabot/13 |
| 2 | npm | glob | .ops/claude/staging/next/pnpm-lock.yaml | glob CLI: Command injection via -c/--cmd executes matches with shell:true | https://github.com/proteaNirav/rocketgpt/security/dependabot/12 |
| 3 | npm | glob | rocketgpt_v3_full/webapp/next/pnpm-lock.yaml | glob CLI: Command injection via -c/--cmd executes matches with shell:true | https://github.com/proteaNirav/rocketgpt/security/dependabot/11 |
| 4 | npm | next | .ops/claude/staging/next/package-lock.json | Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up | https://github.com/proteaNirav/rocketgpt/security/dependabot/19 |
| 5 | npm | next | .ops/claude/staging/next/package-lock.json | Next Vulnerable to Denial of Service with Server Components | https://github.com/proteaNirav/rocketgpt/security/dependabot/18 |
| 6 | npm | next | .ops/claude/staging/next/pnpm-lock.yaml | Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up | https://github.com/proteaNirav/rocketgpt/security/dependabot/21 |
| 7 | npm | next | .ops/claude/staging/next/pnpm-lock.yaml | Next Vulnerable to Denial of Service with Server Components | https://github.com/proteaNirav/rocketgpt/security/dependabot/20 |

### Severity: medium (3)
| # | Ecosystem | Package | Manifest | Summary | Link |
|---:|---|---|---|---|---|
| 1 | npm | nodemailer | .ops/claude/staging/next/package-lock.json | Nodemailer is vulnerable to DoS through Uncontrolled Recursion | https://github.com/proteaNirav/rocketgpt/security/dependabot/29 |
| 2 | npm | nodemailer | .ops/claude/staging/next/pnpm-lock.yaml | Nodemailer is vulnerable to DoS through Uncontrolled Recursion | https://github.com/proteaNirav/rocketgpt/security/dependabot/27 |
| 3 | npm | nodemailer | rocketgpt_v3_full/webapp/next/pnpm-lock.yaml | Nodemailer is vulnerable to DoS through Uncontrolled Recursion | https://github.com/proteaNirav/rocketgpt/security/dependabot/28 |

### Severity: low (3)
| # | Ecosystem | Package | Manifest | Summary | Link |
|---:|---|---|---|---|---|
| 1 | npm | nodemailer | .ops/claude/staging/next/package-lock.json | NodemailerΓÇÖs addressparser is vulnerable to DoS caused by recursive calls | https://github.com/proteaNirav/rocketgpt/security/dependabot/17 |
| 2 | npm | nodemailer | .ops/claude/staging/next/pnpm-lock.yaml | NodemailerΓÇÖs addressparser is vulnerable to DoS caused by recursive calls | https://github.com/proteaNirav/rocketgpt/security/dependabot/15 |
| 3 | npm | nodemailer | rocketgpt_v3_full/webapp/next/pnpm-lock.yaml | NodemailerΓÇÖs addressparser is vulnerable to DoS caused by recursive calls | https://github.com/proteaNirav/rocketgpt/security/dependabot/16 |

