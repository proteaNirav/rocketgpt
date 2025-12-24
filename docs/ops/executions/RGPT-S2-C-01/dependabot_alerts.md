# RGPT-S2-C-01 — Dependabot Snapshot

- Repo: proteaNirav/rocketgpt
- Commit: 50c9f128e1bb78d2c3af66bfac06259e80196c84
- Captured: 2025-12-24 23:05:56 +05:30
- State: open

## Counts
- Total open alerts: **13**

### By severity
- high: 7
- low: 3
- medium: 3

### By ecosystem
- npm: 13

## Top alerts (first 30)
| Severity | Ecosystem | Package | Manifest | Summary | Link |
|---|---|---|---|---|---|
| medium | npm | nodemailer | .ops/claude/staging/next/pnpm-lock.yaml | Nodemailer is vulnerable to DoS through Uncontrolled Recursion | https://github.com/proteaNirav/rocketgpt/security/dependabot/27 |
| medium | npm | nodemailer | rocketgpt_v3_full/webapp/next/pnpm-lock.yaml | Nodemailer is vulnerable to DoS through Uncontrolled Recursion | https://github.com/proteaNirav/rocketgpt/security/dependabot/28 |
| medium | npm | nodemailer | .ops/claude/staging/next/package-lock.json | Nodemailer is vulnerable to DoS through Uncontrolled Recursion | https://github.com/proteaNirav/rocketgpt/security/dependabot/29 |
| low | npm | nodemailer | .ops/claude/staging/next/package-lock.json | NodemailerΓÇÖs addressparser is vulnerable to DoS caused by recursive calls | https://github.com/proteaNirav/rocketgpt/security/dependabot/17 |
| low | npm | nodemailer | rocketgpt_v3_full/webapp/next/pnpm-lock.yaml | NodemailerΓÇÖs addressparser is vulnerable to DoS caused by recursive calls | https://github.com/proteaNirav/rocketgpt/security/dependabot/16 |
| low | npm | nodemailer | .ops/claude/staging/next/pnpm-lock.yaml | NodemailerΓÇÖs addressparser is vulnerable to DoS caused by recursive calls | https://github.com/proteaNirav/rocketgpt/security/dependabot/15 |
| high | npm | next | .ops/claude/staging/next/pnpm-lock.yaml | Next Vulnerable to Denial of Service with Server Components | https://github.com/proteaNirav/rocketgpt/security/dependabot/20 |
| high | npm | next | .ops/claude/staging/next/pnpm-lock.yaml | Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up | https://github.com/proteaNirav/rocketgpt/security/dependabot/21 |
| high | npm | next | .ops/claude/staging/next/package-lock.json | Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up | https://github.com/proteaNirav/rocketgpt/security/dependabot/19 |
| high | npm | next | .ops/claude/staging/next/package-lock.json | Next Vulnerable to Denial of Service with Server Components | https://github.com/proteaNirav/rocketgpt/security/dependabot/18 |
| high | npm | glob | rocketgpt_v3_full/webapp/next/pnpm-lock.yaml | glob CLI: Command injection via -c/--cmd executes matches with shell:true | https://github.com/proteaNirav/rocketgpt/security/dependabot/11 |
| high | npm | glob | .ops/claude/staging/next/pnpm-lock.yaml | glob CLI: Command injection via -c/--cmd executes matches with shell:true | https://github.com/proteaNirav/rocketgpt/security/dependabot/12 |
| high | npm | glob | .ops/claude/staging/next/package-lock.json | glob CLI: Command injection via -c/--cmd executes matches with shell:true | https://github.com/proteaNirav/rocketgpt/security/dependabot/13 |

## Next step
- Create a remediation plan: group by ecosystem, prefer lockfile updates, generate PR(s), run CI + Playwright smoke, close with evidence.
