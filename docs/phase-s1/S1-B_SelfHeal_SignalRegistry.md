# RocketGPT — Phase S1 — Step S1-B
## Self-Heal Engine v1 — Signal Registry

Status: DRAFT  
Scope: Detection only (no execution)

---

## Purpose
This registry defines **all signals** that can trigger the Self-Heal Engine.
Each signal is **observable, deterministic, and ledgerable**.

---

## Signal Categories

### 1. Runtime Signals
| Code | Source | Description |
|----|------|------------|
| RT_API_5XX | API | API returned 5xx |
| RT_TIMEOUT | Orchestrator | Execution timeout |
| RT_RETRY_EXHAUSTED | Orchestrator | Retries exhausted |

---

### 2. CI / Test Signals
| Code | Source | Description |
|----|------|------------|
| CI_TEST_FAIL | Playwright | Test failure |
| CI_FLAKY_PATTERN | CI | Intermittent failures |
| CI_BUILD_FAIL | CI | Build failure |

---

### 3. Policy & Safety Signals
| Code | Source | Description |
|----|------|------------|
| POLICY_SAFE_MODE | Policy Gate | Safe-Mode blocked execution |
| POLICY_APPROVAL_MISSING | Policy Gate | Approval required |
| POLICY_PERMISSION_DENIED | Auth | Permission denied |

---

### 4. System Health Signals
| Code | Source | Description |
|----|------|------------|
| SYS_DEP_UNAVAILABLE | Health Probe | Dependency unreachable |
| SYS_RATE_LIMIT | Gateway | Rate limit hit |

---

## Signal Handling Rules (v1)
- Signals are **read-only inputs**
- One signal ⇒ one Heal Decision
- No auto-fix in Phase S1
- All signals must result in a **Decision Ledger entry**

---

## Next
- Map signals → heal playbooks
- Define confidence scoring
