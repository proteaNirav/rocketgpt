# RGPT-S4-A1 — Runtime Guard Coverage Audit

Generated: 2026-01-03 15:37:58

## Summary

* Total routes scanned: **67**
* CALL_ONLY (REVIEW): **5**
* LIKELY_GUARDED: **1**
* UNGUARDED (LIKELY): **61**

## Details

| Status | Import Hit | Call Hit | Route File |
|---|---:|---:|---|
| CALL_ONLY (REVIEW) | False | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\execute-all\route.ts |
| CALL_ONLY (REVIEW) | False | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\planner\run\route.ts |
| CALL_ONLY (REVIEW) | False | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\planner\route.ts |
| CALL_ONLY (REVIEW) | False | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\tester\route.ts |
| CALL_ONLY (REVIEW) | False | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\tester\execute\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\rgpt\runtime-mode\route.ts |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\approvals\create\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\approvals\update-status\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\builder\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\core-ai\ledger\ping\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\debug-auth\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\demo\chat\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\demo\orchestrator\status\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\demo\self-study\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\demo\upload\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\edge\echo\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\edge\ping\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\env\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\guest\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\health\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\limits\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\llm\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\logs\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\admin\safe-mode\disable\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\admin\safe-mode\enable\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\admin\safe-mode\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\auto-advance\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\build\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\execute-next\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\list\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\clear-cache\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\config\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\health\basic\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\health\deep\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\health\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\info\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\logs\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\plan\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\release\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\builder\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\finalize\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\status\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run-history\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\safe-mode\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\start-run\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\status\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\test\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\test-tester\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\planner\plan\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\planner\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\plans\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\report-error\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\self-improve\run\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\self-improve\status\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\sessions\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\status\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\suggest\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\tester\health\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\tester\run\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\usage\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\version\route.ts |

