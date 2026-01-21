# RGPT-S4-A1 — Runtime Guard Coverage Audit (POST-FIX)

Generated: 2026-01-03 19:35:48

## Summary

* Total routes scanned: **67**
* LIKELY_GUARDED: **50**
* UNGUARDED (LIKELY): **17**

## Details

| Status | Import Hit | Call Hit | Route File |
|---|---:|---:|---|
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\approvals\create\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\approvals\update-status\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\builder\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\core-ai\ledger\ping\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\debug-auth\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\demo\chat\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\demo\orchestrator\status\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\demo\self-study\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\demo\upload\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\env\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\guest\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\health\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\limits\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\llm\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\logs\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\auto-advance\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\build\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\execute-next\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\list\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\config\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\health\basic\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\health\deep\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\health\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\info\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\logs\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\release\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\builder\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\finalize\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\status\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run-history\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\safe-mode\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\status\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\test\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\orchestrator\test-tester\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\planner\plan\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\planner\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\plans\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\report-error\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\rgpt\runtime-mode\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\self-improve\run\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\self-improve\status\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\sessions\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\status\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\suggest\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\tester\health\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\tester\run\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\usage\route.ts |
| LIKELY_GUARDED | True | True | rocketgpt_v3_full\webapp\next\app\api\version\route.ts |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False |  |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\edge\echo\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\edge\ping\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\admin\safe-mode\disable\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\admin\safe-mode\enable\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\admin\safe-mode\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\builder\execute-all\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\clear-cache\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\plan\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\planner\run\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\planner\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\run\tester\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\start-run\route.ts |
| UNGUARDED (LIKELY) | False | False | rocketgpt_v3_full\webapp\next\app\api\orchestrator\tester\execute\route.ts |
